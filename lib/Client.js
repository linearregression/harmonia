'use strict';

var Promise = require('bluebird');
var uuid = require('uuid');
var amqp = require('amqplib');
var ClientResponse = require('./client/Response');
var ErrorResponse = require('./client/ErrorResponse');

function Client(channel, options) {
  options = options || {};

  this.channel = channel;
  this.messages = {};
  this.timeout = options.timeout || Client.defaultTimeout;
}

Client.defaultTimeout = false;

Client.prototype._onReply = function(message) {
  var correlationId = message.properties.correlationId;

  if (this.messages[correlationId]) {

    if (Buffer.isBuffer(message.content)) {
      message.content = message.content.toString('utf8');

      try {
        message.content = JSON.parse(message.content);
      } catch (err) {}
    }

    if (!message.content || message.content.error) {
      this.messages[correlationId].reject(new ErrorResponse(message));
    } else {
      this.messages[correlationId].resolve(new ClientResponse(message));
    }

    delete this.messages[correlationId];
  }
};

Client.prototype._createAnonymousReplyQueue = function() {
  return Promise.resolve(this.channel.assertQueue('', {
    exclusive : true,
    autoDelete : true
  }));
};

Client.prototype._subscribeToQueue = function(queue) {
  return Promise.resolve(this.channel.consume(queue, this._onReply.bind(this)))
    .disposer(function(consumer) {
      return Promise.resolve(this.channel.ackAll())
        .bind(this)
        .then(function() {
          return this.channel.cancel(consumer.consumerTag);
        });
    }.bind(this));
};

Client.prototype.awaitMethod = function(method, params, options) {
  return this.awaitMethodBulk(method, [ params ], options)
    .then(function(results) {
      if (results[0] instanceof Error) {
        throw results[0];
      }

      return results[0];
    });
};

/**
 * @deprecated
 */
Client.prototype.call = Client.prototype.awaitMethod;

Client.prototype.awaitMethodBulk = function(method, paramList, options) {

  return Promise.resolve(this._createAnonymousReplyQueue())
    .bind(this)
    .then(function(anonymousQueue) {

      var replyQueue = anonymousQueue.queue;

      return Promise.using(this._subscribeToQueue(replyQueue), function() {
        var promises = paramList.map(function(params) {
          var callPromise = new Promise(function(resolve, reject) {
            var correlationId = uuid.v4();

            this.messages[correlationId] = {
              resolve : resolve,
              reject : reject
            };

            options = options || {};

            options.messageId = correlationId;
            options.correlationId = correlationId;
            options.replyTo = replyQueue;

            if (this.timeout) {
              options.messageTtl = this.timeout;
            }

            return this.invokeMethod(method, params, options);
          }.bind(this));

          if (this.timeout) {
            return callPromise.timeout(this.timeout);
          }

          return callPromise;
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

  options = options || {};
  options.headers = options.headers || {};

  options.headers['harmonia-message'] = '1.0';

  if (! options.messageId) {
    options.messageId = uuid.v4();
  }

  var content = new Buffer(JSON.stringify(params));

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

Client.createClient = function(amqpUrl, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  return Promise.using(Client.createConnection(amqpUrl), function(connection) {
    return Promise.using(Client.createChannel(connection), function(channel) {
      var client = new Client(channel, options);

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
