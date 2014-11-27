'use strict';

var util           = require('util');
var _              = require('lodash');
var EventEmitter   = require('events').EventEmitter;
var Coyote         = require('coyote');
var ClusteredRoute = require('./ClusteredRoute');

/**
 * Create a new Harmonia Server instance
 *
 * @param {string} type One of 'rpc' or 'worker'
 * @param {object} options
 */
function Server(type) {
  EventEmitter.call(this);

  if (type && (type !== 'rpc' && type !== 'worker')) {
    throw new Error('Invalid server type');
  }

  this.type   = type || 'rpc';
  this.routes = {};
}

util.inherits(Server, EventEmitter);

Server.prototype.route = function(routeConfig) {
  var route = new ClusteredRoute(routeConfig);

  if (this.routes[route.method]) {
    throw new Error('Conflicting method name');
  }

  this.routes[route.method] = route;

  return this;
};

Server.prototype.listen = function(amqpUrl) {
  return Coyote.createConnection(amqpUrl)
    .bind(this)
    .then(function(connection) {
      this.connection = connection;

      var socketType = this.type === 'rpc' ? 'REPLY' : 'WORKER';
      _.each(this.routes, function(route) {
        route.start(this.connection, socketType);
      }.bind(this));
    });
};

Server.prototype.pause = function() {
  this.coyote.pause();
  return this;
};

Server.prototype.resume = function() {
  this.coyote.resume();
  return this;
};

Server.prototype.shutdown = function() {
  this.coyote.shutdown();
  return this;
};

module.exports = Server;
