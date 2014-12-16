'use strict';

var Promise = require('bluebird');
var Joi = require('joi');
var uuid = require('uuid');
var Message = require('./Message');
var Handler = require('./Handler');
var schema = require('./schema');

function Route(server, config) {
  this.server = server;

  Joi.assert(config, schema.route, 'route');

  this.channel = null;
  this.inProgress = {};

  this.method = config.method;
  this.handler = config.config.handler;
  this.validation = config.config.validate;
  this.concurrency = config.concurrency || 1;
  this.onError = config.config.onError;
  this.response = config.response === true ? true : false;

  if (! this.validation) {
    this.validation = Joi.any().optional();
  }
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

Route.prototype.sendResponse = function(request, response) {
  var payload = response.toMessage().format();
  this.channel.sendToQueue(request.properties.replyTo, payload.content, payload.properties);
};

Route.prototype.onMessage = function(message) {
  var request = new Message(message);

  var handler = new Handler(this, request, {
    response : this.response
  });

  var msgId = uuid.v4();

  var promise = handler.handle().bind(this).then(function(response) {

    if (response.disposition === 'nack') {
      return this.channel.nack(message, false, false);
    } else if (response.disposition === 'requeue') {
      return this.channel.nack(message, false, true);
    }

    response.properties.correlationId = message.properties.correlationId;

    if (request.properties.replyTo) {

      if (request.headers['x-state']) {
        response.headers['x-state'] = request.headers['x-state'];
      }

      response.properties.persistent = true;
      this.sendResponse(request, response);
    }

    this.channel.ack(message);
  }).catch(function(err) {
    // Not sure why you'd ever pick this, but I'll allow it anyway
    if (this.onError === 'ack') {
      this.channel.ack(message);
    } else if (this.onError === 'nack') {
      this.channel.nack(message, false, false);
    } else if (this.onError === 'requeue') {
      this.channel.nack(message, false, true);
    }

    throw err;
  }).finally(function() {
    delete this.inProgress[msgId];
  });

  this.inProgress[msgId] = promise;
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
  return this._createChannel().bind(this)
    .then(function() {
      return Promise.resolve(this.channel.assertQueue(this.method), {
        durable : true
      });
    })
    .then(function() {
      return Promise.resolve(this.channel.consume(this.method, this.onMessage.bind(this), {
        noAck : false
      })).then(function(queue) {
        this.consumerTag = queue.consumerTag;
      }.bind(this));
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
  return this.pause().then(function() {
    return Promise.props(this.inProgress);
  }.bind(this)).then(function() {
    return this.channel.close();
  }.bind(this)).then(function() {
    this.channel = null;
  }.bind(this));
};

module.exports = Route;
