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
  }));
};

Client.prototype.awaitMethod = function(method, params, options) {
  return this.awaitMethodBulk(method, [ params ], options)
    .then(function(results) {
      return results[0];
    });
};

/**
 * @deprecated
 */
Client.prototype.call = Client.prototype.awaitMethod;

Client.prototype.awaitMethodBulk = function(method, paramList, options) {

  return Promise.resolve(this._createAnonymousReplyQueue(this.channel))
    .bind(this)
    .then(function(anonymousQueue) {

      var replyQueue = anonymousQueue.queue;

      var consumer = Promise.resolve(this.channel.consume(replyQueue, this._onReply.bind(this)))
        .disposer(function(consumer) {
          return Promise.resolve(this.channel.ackAll()).bind(this).then(function() {
            return this.channel.cancel(consumer.consumerTag);
          });
        }.bind(this));

      return Promise.using(consumer, function() {
        var promises = paramList.map(function(params) {
          return new Promise(function(resolve, reject) {
            var correlationId = uuid.v4();

            this.messages[correlationId] = {
              resolve : resolve,
              reject : reject
            };

            options = options || {};

            options.correlationId = correlationId;
            options.replyTo = replyQueue;

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
      }.bind(this));
    }.bind(this));
};

Client.prototype.invokeMethod = function(method, params, options) {

  var content = new Buffer(JSON.stringify({
    method : method,
    params : params
  }));

  return Promise.resolve(this.channel.sendToQueue(method, content, options));
};

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

      if (! result || typeof result.then !== 'function') {
        throw new Error('Callback must return a promise');
      }

      return result;
    });
  });
};

/**
 * @deprecated
 */
Client.create = Client.createClient;

module.exports = Client;
