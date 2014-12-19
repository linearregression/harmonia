'use strict';

var _ = require('lodash');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');
var amqp = require('amqplib');
var Route = require('./Route');
var schema = require('./schema');

/**
 * Create a new Harmonia Server instance
 *
 * @param {object} options
 */
function Server(options) {
  EventEmitter.call(this);

  schema.assert(options, schema.server, 'server');

  this.type = options.type;
  this.amqpUrl = options.amqpUrl;
  this.socketOptions = options.socketOptions;
  this.routes = {};
}

util.inherits(Server, EventEmitter);

Server.prototype.route = function(routeConfig) {
  var route = new Route(this, routeConfig);

  if (this.routes[route.method]) {
    throw new Error(util.format('Conflicting method name: %s', route.method));
  }

  this.routes[route.method] = route;

  return this;
};

Server.prototype._connect = function() {
  return Promise.resolve(amqp.connect(this.amqpUrl, this.socketOptions));
};

Server.prototype.listen = function() {
  return this._connect().bind(this).then(function(connection) {
    this.connection = connection;
    var promises = _.map(this.routes, function(route) {
      return route.start(this.connection);
    }, this);

    return Promise.all(promises);
  });
};

Server.prototype.pause = function() {
  var promises = _.map(this.routes, function(route) {
    return route.pause();
  });

  return Promise.all(promises);
};

Server.prototype.resume = function() {
  var promises = _.map(this.routes, function(route) {
    return route.resume();
  });

  return Promise.all(promises);
};

Server.prototype.shutdown = function() {
  var promises = _.map(this.routes, function(route) {
    return route.shutdown();
  });

  return Promise.all(promises).bind(this).finally(function() {
    return this.connection.close();
  });
};

module.exports = Server;
