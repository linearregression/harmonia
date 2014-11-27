'use strict';

var Promise = require('bluebird');
var Coyote  = require('coyote');
var uuid    = require('uuid');

function Client(connection, type) {
  if (type && (type !== 'request' && type !== 'push' && type !== 'publish')) {
    throw new Error('Invalid client type');
  }

  type = type || 'request';

  this.connection = connection;
  this.messages   = {};
  this.ready      = false;

  switch (type) {
    case 'request':
      this.type = 'REQUEST';
      break;
    case 'push':
      this.type = 'PUSH';
      break;
    case 'publish':
      this.type = 'PUBLISH';
      break;
  }
}

Client.createClient = function(amqpUrl, type) {
  return Coyote.createConnection(amqpUrl)
    .bind(this)
    .then(function(connection) {
      return new Client(connection, type);
    });
};

Client.prototype.onMessage = function(message) {
  if (this.type !== 'REQUEST') {
    return;
  }

  var correlationId = message.properties.correlationId;

  if (this.messages[correlationId]) {
    this.messages[correlationId].resolve(message);
  }
};

Client.prototype.call = function(method, params) {
  return Promise.using(this._getChannel(method), function(coyote) {
    return new Promise(function(resolve, reject) {
      var correlationId = uuid.v4();

      if (this.type === 'REQUEST') {
        this.messages[correlationId] = {
          resolve : resolve,
          reject  : reject
        };
      }

      coyote.write({
        properties : {
          correlationId : correlationId
        },
        content : new Buffer(JSON.stringify({
          method : this.method,
          params : params
        }))
      });
    }.bind(this));
  }.bind(this));
};

Client.prototype._getChannel = function(method) {
  return new Promise(function(resolve, reject) {
    var coyote = new Coyote(this.connection, this.type, method);
    coyote.on('ready', function() {
      resolve(coyote);
    });

    coyote.on('response', this.onMessage.bind(this));
  }.bind(this)).disposer(function(coyote) {
    coyote.shutdown();
  });
};

module.exports = Client;
