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
  this.handler = config.config.handler;
  this.validation = config.config.validate || Joi.any().optional();
  this.concurrency = config.concurrency || 1;
  this.onError = config.config.onError || 'nack';
  this.invalidMessageHandler = config.config.invalidMessageHandler || null;

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
  if (typeof handlerResult.catch !== 'function') {
    return;
  }

  var msgId = uuid.v4();

  this.inProgress[msgId] = true;

  handlerResult
    .catch(function(err) {
      // Not sure why you'd ever pick this, but I'll allow it anyway
      if (this.onError === 'ack') {
        this.channel.ack(message);
      } else if (this.onError === 'nack') {
        this.channel.nack(message, false, false);
      } else if (this.onError === 'requeue') {
        this.channel.nack(message, false, true);
      }

      throw err;
    }.bind(this))
    .finally(function() {
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

Route.prototype.start = function() {
  return this._createChannel()
    .bind(this)
    .then(function() {
      return this.channel.assertQueue(this.method, {
        durable : true
      });
    })
    .then(function() {
      return this.channel.consume(this.method, this.onMessage.bind(this), {
        noAck : false
      });
    }).then(function(queue) {
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
