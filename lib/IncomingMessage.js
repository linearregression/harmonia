'use strict';

var _ = require('lodash');
var assert = require('assert');
var Promise = require('bluebird');
var schema = require('./schema');

function IncomingMessage(obj, channel) {

  assert(typeof obj === 'object', 'IncomingMessage must be constructed with an object');
  assert(typeof channel === 'object', 'IncomingMessage must be constructed with a channel');

  this._originalMessage = obj;
  this._channel = channel;

  this.content = Buffer.isBuffer(obj.content) ? obj.content.toString('utf8') : _.clone(obj.content);
  this.properties = _.clone(obj.properties);
  this.fields = _.clone(obj.fields);
  this.params = {};

  // If contentType is not set or if it is application/json, try to decode as json
  if (! this.properties.contentType || this.properties.contentType === 'application/json') {

    // If we were unable to decode, ignore the error and leave it to the handler
    try {
      this.params = JSON.parse(this.content);
    } catch (err) {}
  }

  schema.assert(this.properties, schema.messageProperties);
  schema.assert(this.fields, schema.messageFields);

  this.resolved = false;
}

/**
 * Sends a reply to this message, implicitly ACKing it. The result will be
 * ignored if the message does not contain the `replyTo` property or its
 * `replyTo` is null.
 *
 * @param  {mixed} payload The payload to send as a reply from this message. If
 *                         it is not a buffer, it will be stringified and
 *                         then written into a buffer.
 * @param {object} headers AMQP headers to send with the message
 * @return {Promise}
 */
IncomingMessage.prototype.reply = function(content, headers) {
  if (this.resolved) {
    throw new Error('Cannot reply to a resolved message');
  }

  if (! this.properties.replyTo) {
    return this.ack();
  }

  headers = headers || {};

  var properties = {
    persistent : true
  };

  if (this.properties.correlationId) {
    properties.correlationId = this.properties.correlationId;
  }

  if (! Buffer.isBuffer(content)) {
    content = new Buffer(JSON.stringify(content));
  }

  properties.headers = headers;

  return Promise.resolve(this._channel.sendToQueue(
    this.properties.replyTo,
    content,
    properties
  )).bind(this)
    .then(function() {
      return this.ack();
    })
    .then(function() {
      this.resolved = true;
    });
};

IncomingMessage.prototype.replyWithError = function(error) {
  return this.reply({
    error : {
      name : error.name,
      message : error.message,
      code : error.isBoom ? error.output.statusCode : error.code
    }
  }, {
    'harmonia-error' : error.isBoom ? 'boom' : 'error'
  });
};

IncomingMessage.prototype.ack = function() {
  if (this.resolved) {
    throw new Error('Cannot NACK a resolved message');
  }

  return Promise.resolve(this._channel.ack(this._originalMessage))
    .then(function() {
      this.resolved = true;
    }.bind(this));
};

IncomingMessage.prototype.nack = function() {
  if (this.resolved) {
    throw new Error('Cannot NACK a resolved message');
  }

  return Promise.resolve(this._channel.nack(
    this._originalMessage,
    false, // just nack this message, not all the ones we've received
    false // don't requeue
  )).then(function() {
    this.resolved = true;
  }.bind(this));
};

IncomingMessage.prototype.requeue = function() {
  if (this.resolved) {
    throw new Error('Cannot requeue a resolved message');
  }

  return Promise.resolve(this._channel.nack(
    this._originalMessage,
    false, // just nack this message, not all the ones we've received
    true // requeue the message
  )).then(function() {
    this.resolved = true;
  }.bind(this));
};

module.exports = IncomingMessage;
