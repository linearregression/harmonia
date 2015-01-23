'use strict';

var Boom = require('boom');
var Promise = require('bluebird');

function Handler(route, message, options) {
  this.route = route;
  this.message = message;
  this.options = options || {};
}

function isBoomError(err) {
  return err.isBoom;
}

Handler.prototype.handle = function() {

  var validateParams = this.route.validate(this.message.params, this.message);
  if (validateParams.error) {

    var promise;
    if (this.route.invalidMessageHandler) {
      promise = Promise.try(
        this.route.invalidMessageHandler,
        [ validateParams.error, this.message ]
      );
    } else {
      promise = Promise.resolve();
    }

    return promise.bind(this).finally(function() {
      if (this.message.resolved) {
        return;
      }

      var error = validateParams.error;
      if (error instanceof Error) {
        error = Boom.wrap(validateParams.error, 400)
      } else {
        error = Boom.badRequest(error);
      }

      return this.message.replyWithError(error);
    });
  }

  return this._handle()
    .bind(this)
    .then(function(val) {
      if (this.message.resolved) {
        return;
      }

      return this.message.reply(val);
    })
    .catch(function(err) {
      if (this.message.resolved) {
        throw err;
      }

      var handle;
      if (this.options.onError === 'ack') {
        handle = this.message.ack();
      } else if (this.options.onError === 'nack') {
        handle = this.message.nack();
      } else if (this.options.onError === 'requeue') {
        handle = this.message.requeue();
      } else {
        throw err;
      }

      return handle.throw(err);
    });
};

Handler.prototype._handle = function() {
  return Promise.try(this.route.handler, [ this.message ])
    .catch(isBoomError, function(err) {
      return this.message.replyWithError(err);
    }.bind(this));
};

module.exports = Handler;
