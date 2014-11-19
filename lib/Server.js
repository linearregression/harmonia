'use strict';

var util         = require('util');
var EventEmitter = require('events').EventEmitter;
var Coyote       = require('coyote');
var Route        = require('./Route');
var Handler      = require('./Handler');

function Server(serviceName, type) {
  EventEmitter.call(this);

  if (type && (type !== 'rpc' && type !== 'worker')) {
    throw new Error('Invalid server type');
  }

  this.type = type || 'rpc';

  this.serviceName = serviceName;
  this.coyote      = null;
  this.routes      = {};
}

util.inherits(Server, EventEmitter);

Server.prototype.route = function(routeConfig) {
  var route = new Route(routeConfig);

  if (this.routes[route.method]) {
    throw new Error('Conflicting method name');
  }

  this.routes[route.method] = route;

  return this;
};

Server.prototype.onMessage = function(message, callback) {
  var handler = new Handler(this.routes, message, callback);
  handler.handle();
};

Server.prototype.listen = function(amqpUrl) {
  var socket = this.type === 'rpc' ? 'REPLY' : 'WORKER';

  this.coyote = new Coyote(amqpUrl, socket, this.serviceName);

  this.coyote.on('message', this.onMessage.bind(this));

  this.coyote.on('ready', function() {

    this.emit('debug', 'Listening', {
      serviceName : this.serviceName,
      amqpUrl     : amqpUrl
    });

  }.bind(this));
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
