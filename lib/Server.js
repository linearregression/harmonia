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
    throw new Error('Conflicting method name');
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
    _.each(this.routes, function(route) {
      route.start(this.connection);
    }, this);
  });
};

Server.prototype.pause = function() {
  // this.coyote.pause();
  return this;
};

Server.prototype.resume = function() {
  // this.coyote.resume();
  return this;
};

Server.prototype.shutdown = function() {
  // this.coyote.shutdown();
  return this;
};

module.exports = Server;
