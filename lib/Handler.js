'use strict';

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

  var validateParams = this.route.validate(this.message.content);
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

      if (this.options.onError === 'ack') {
        return this.message.ack();
      } else if (this.options.onError === 'nack') {
        return this.message.nack();
      } else if (this.options.onError === 'requeue') {
        return this.message.requeue();
      }
    });
  }

  return this._handle();
};

Handler.prototype._handle = function() {
  return Promise.try(this.route.handler, [ this.message ])
    .catch(isBoomError, function(err) {
      return this.message.replyWithError(err);
    }.bind(this));
};

module.exports = Handler;
