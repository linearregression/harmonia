'use strict';

var Promise = require('bluebird');
var Joi = require('joi');
var Message = require('./Message');
var Handler = require('./Handler');
var schema = require('./schema');

function Route(server, config) {
  this.server = server;

  Joi.assert(config, schema.route, 'route');

  this.channel = null;

  this.method = config.method;
  this.handler = config.config.handler;
  this.validation = config.config.validate;
  this.concurrency = config.concurrency || 1;
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

  handler.handle().bind(this).then(function(response) {

    if (response.disposition === 'nack') {
      return this.channel.nack(message, false, false);
    } else if (response.disposition === 'requeue') {
      return this.channel.nack(message, false, true);
    }

    response.properties.correlationId = message.properties.correlationId;

    if (request.properties.replyTo) {
      response.properties.persistent = true;
      this.sendResponse(request, response);
    }

    this.channel.ack(message);
  });
};

Route.prototype._createChannel = function() {
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

module.exports = Route;
