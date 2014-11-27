'use strict';

var Promise = require('bluebird');
var Coyote  = require('coyote');
var uuid    = require('uuid');

function Client(connection, type, method) {
  if (type && (type !== 'request' && type !== 'push' && type !== 'publish')) {
    throw new Error('Invalid client type');
  }

  type = type || 'request';

  this.connection = connection;
  this.method     = method;
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

Client.createClient = function(amqpUrl, type, method) {
  return Coyote.createConnection(amqpUrl)
    .bind(this)
    .then(function(connection) {
      var client = new Client(connection, type, method);
      return client.connect().return(client);
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

Client.prototype.call = function(params) {

  return new Promise(function(resolve, reject) {
    var correlationId = uuid.v4();

    if (this.type === 'REQUEST') {
      this.messages[correlationId] = {
        resolve : resolve,
        reject  : reject
      };
    }

    this.coyote.write({
      properties : {
        correlationId : correlationId
      },
      content : new Buffer(JSON.stringify({
        method : this.method,
        params : params
      }))
    });
  }.bind(this));

};

Client.prototype.connect = function() {
  return new Promise(function(resolve, reject) {
    this.coyote = new Coyote(this.connection, this.type, this.method);
    this.coyote.on('ready', function() {
      resolve();
    });

    this.coyote.on('response', this.onMessage.bind(this));
  }.bind(this));
};

module.exports = Client;
