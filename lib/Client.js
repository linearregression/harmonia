'use strict';

var Promise = require('bluebird');
var Coyote  = require('coyote');
var uuid    = require('uuid');

function Client(amqpUrl, serviceName, type) {
  if (type && (type !== 'request' && type !== 'push' && type !== 'publish')) {
    throw new Error('Invalid client type');
  }

  this.ready       = false;
  this.serviceName = serviceName;
  this.type        = type || 'request';
  this.pending     = [];

  this.messages = {};

  var socketType;

  switch (this.type) {
    case 'request':
      socketType = 'REQUEST';
      break;
    case 'push':
      socketType = 'PUSH';
      break;
    case 'publish':
      socketType = 'PUBLISH';
      break;
  }

  this.coyote = new Coyote(amqpUrl, socketType, this.serviceName);

  this.coyote.on('response', this.onMessage.bind(this));
  this.coyote.on('ready', function() {
    this.ready = true;
    var pending;

    while ((pending = this.pending[0])) {
      this._write(this.pending[0]);
      this.pending.shift();
    }
  }.bind(this));
}

Client.prototype.onMessage = function(message) {
  if (this.type !== 'request') {
    return;
  }

  if (! message.properties.correlationId) {
    return;
  }

  var correlationId = message.properties.correlationId;

  if (this.messages[correlationId]) {
    this.messages[correlationId].resolve(message);
  }
};

Client.prototype.callMethod = function(method, params) {
  return new Promise(function(resolve, reject) {
    var correlationId = uuid.v4();

    if (this.type === 'request') {
      this.messages[correlationId] = {
        resolve : resolve,
        reject  : reject
      };
    }

    this._write({
      properties : {
        correlationId : correlationId
      },
      content : {
        method : method,
        params : params
      }
    });
  }.bind(this));
};

Client.prototype._write = function(data) {
  if (! this.ready) {
    return this.pending.push(data);
  }

  return this.coyote.write(data);
};

module.exports = Client;
