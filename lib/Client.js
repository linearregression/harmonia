'use strict';

var Promise = require('bluebird');
var uuid = require('uuid');
var amqp = require('amqplib');
var ClientResponse = require('./client/Response');
var ErrorResponse = require('./client/ErrorResponse');

function Client(channel) {
  this.channel = channel;
  this.messages = {};
}

Client.ErrorResponse = ErrorResponse;

Client.createConnection = function(amqpUrl) {
  return Promise.resolve(amqp.connect(amqpUrl))
    .disposer(function(connection) {
      return connection.close();
    });
};

Client.createChannel = function(connection) {
  return Promise.resolve(connection.createChannel())
    .disposer(function(channel) {
      return channel.close();
    });
};

Client.createClient = function(amqpUrl, callback) {
  return Promise.using(Client.createConnection(amqpUrl), function(connection) {
    return Promise.using(Client.createChannel(connection), function(channel) {
      var client = new Client(channel);

      var result = callback(client);

      if (typeof result.then !== 'function') {
        throw new Error('Callback must return a promise');
      }

      return result;
    });
  });
};

Client.create = Client.createClient;

Client.prototype._onReply = function(message) {
  var correlationId = message.properties.correlationId;

  if (this.messages[correlationId]) {

    if (message.content.error) {
      this.messages[correlationId].reject(new ErrorResponse(message));
    } else {
      this.messages[correlationId].resolve(new ClientResponse(message));
    }

    delete this.messages[correlationId];
  }
};

Client.prototype._createAnonymousReplyQueue = function(channel) {
  return Promise.resolve(this.channel.assertQueue('', {
    exclusive : true,
    autoDelete : true
  })).disposer(function(queue) {
    return channel.cancel(queue.consumerTag);
  });
};

Client.prototype.awaitMethod = function(method, params, options) {
  return this.awaitMethodBulk(method, [ params ], options)
    .then(function(results) {
      return results[0];
    });
};

Client.prototype.awaitMethodBulk = function(method, paramList, options) {

  return Promise.resolve(this.channel.assertQueue('', {
    exclusive : true,
    autoDelete : true
  })).bind(this).then(function(replyQueue) {

    return Promise.resolve(this.channel.consume(replyQueue.queue, this._onReply.bind(this)))
      .bind(this)
      .then(function() {

        var promises = paramList.map(function(params) {
          return new Promise(function(resolve, reject) {
            var correlationId = uuid.v4();

            this.messages[correlationId] = {
              resolve : resolve,
              reject : reject
            };

            options = options || {};

            options.correlationId = correlationId;
            options.replyTo = replyQueue.queue;

            return this.invokeMethod(method, params, options);
          }.bind(this));
        }, this);

        return Promise.all(promises.map(function(promise) {
          return promise.reflect();
        })).map(function(result) {
          if (result.isFulfilled()) {
            return result.value();
          } else {
            return result.reason();
          }
        });
      });
  });
};

Client.prototype.invokeMethod = function(method, params, options) {

  var content = new Buffer(JSON.stringify({
    method : method,
    params : params
  }));

  return this.channel.sendToQueue(method, content, options);
};

module.exports = Client;
