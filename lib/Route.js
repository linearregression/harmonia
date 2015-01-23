'use strict';

var Promise = require('bluebird');
var Joi = require('joi');
var uuid = require('uuid');
var Message = require('./IncomingMessage');
var Handler = require('./Handler');
var schema = require('./schema');

function Route(server, config) {
  this.server = server;

  Joi.assert(config, schema.route, 'route');

  this.channel = null;
  this.inProgress = {};

  this.method = config.method;
  this.deadLetterExchange = config.deadLetterExchange || null;
  this.handler = config.config.handler;
  this.validation = config.config.validate || Joi.any().optional();
  this.concurrency = config.concurrency || 1;
  this.onError = config.config.onError || 'nack';
  this.invalidMessageHandler = config.config.invalidMessageHandler || null;
  this.bindToExchanges = config.bindToExchanges || [];

  // Response defaults to false (must be === true in order to be true)
  this.response = config.response === true;
}

Route.validate = function(config) {
  return Joi.validate(config, schema, 'route');
};

Route.prototype.validate = function(params) {
  return Joi.validate(
    params,
    this.validation.options({
      language : { root : 'params' }
    }),
    {
      abortEarly   : false,
      stripUnknown : true,
      presence     : 'required'
    }
  );
};

Route.prototype.onMessage = function(object) {
  var message = new Message(object, this.channel);

  var handler = new Handler(this, message, {
    onError : this.onError,
    response : this.response,
  });

  // Save this promise for later
  var handlerResult = handler.handle();

  // If the handler returned a promise, then we can track it so that we can
  // cleanly handle shutdown signals
  if (typeof handlerResult.finally !== 'function') {
    return Promise.resolve();
  }

  var msgId = uuid.v4();

  this.inProgress[msgId] = true;

  return handlerResult.finally(function() {
    delete this.inProgress[msgId];
  }.bind(this));
};

Route.prototype._createChannel = function() {
  if (this.channel) {
    return Promise.resolve(this.channel);
  }

  return Promise.resolve(this.server.connection.createChannel())
    .bind(this)
    .then(function(channel) {
      this.channel = channel;
      this.channel.prefetch(this.concurrency);
    });
};

Route.prototype.createBindings = function() {
  return Promise.map(this.bindToExchanges, function(exchange) {
    return Promise.resolve(this.channel.assertExchange(exchange.exchange, exchange.type))
      .bind(this)
      .then(function() {
        return this.channel.bindQueue(this.method, exchange.exchange, exchange.routingKey);
      });
  }.bind(this));
};

Route.prototype.start = function() {
  var queueOptions = {
    durable : true
  };

  if (this.deadLetterExchange) {
    queueOptions.deadLetterExchange = this.deadLetterExchange;
  }

  return this._createChannel()
    .bind(this)
    .then(function() {
      return this.channel.assertQueue(this.method, queueOptions);
    })
    .then(function() {
      return this.createBindings();
    })
    .then(function() {
      return this.channel.consume(this.method, this.onMessage.bind(this), {
        noAck : false
      });
    })
    .then(function(queue) {
      this.consumerTag = queue.consumerTag;
    });
};

Route.prototype.pause = function() {
  if (this.channel) {
    return Promise.resolve(this.channel.cancel(this.consumerTag));
  }

  return Promise.resolve();
};

Route.prototype.resume = function() {
  return this.start();
};

Route.prototype.shutdown = function() {
  return this.pause()
    .bind(this)
    .then(function() {
      return Promise.props(this.inProgress);
    })
    .then(function() {
      return this.channel.close();
    })
    .then(function() {
      this.channel = null;
    });
};

module.exports = Route;
