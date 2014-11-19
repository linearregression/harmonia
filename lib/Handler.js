'use strict';

var Promise  = require('bluebird');
var Request  = require('./Request');
var Response = require('./Response');

function Handler(routes, message, callback) {
  this.routes   = routes;
  this.message  = message;
  this.callback = callback;
  this.request  = null;

  this.replied  = false;
}

Handler.prototype.handle = function() {
  try {
    this.request = new Request(this.message);
  } catch (validate) {
    return this.error({
      message : 'Bad request',
      code    : 400,
      data    : validate.error.details
    });
  }

  this.route = this.routes[this.request.method];

  if (! this.route) {
    return this.error({
      message : 'Method not allowed',
      code    : 405
    });
  }

  var validateParams = this.route.validate(this.request.params);
  if (validateParams.error) {
    return this.error({
      message : 'Unprocessable entity',
      code    : 422,
      data    : validateParams.error.details
    });
  }

  this.request.params = validateParams.value;

  return this._handle();
};

function BoomError(err) {
  return err.isBoom;
}

Handler.prototype._handle = function() {
  return Promise.try(this.route.handler, [ this.request, Response ])
    .then(function sendResponse(response) {
      if (response instanceof Response) {
        this.reply(response);
      } else {
        this.reply(new Response(response));
      }
    }.bind(this))
    .catch(BoomError, function(err) {
      return this.error({
        message : err.message,
        code    : err.output.statusCode
      });
    }.bind(this))
    .catch(function(err) {
      this.error({
        message : 'Internal server error',
        code    : 500,
        data    : err.message
      });

      throw err;
    }.bind(this));
};

Handler.prototype.error = function(response) {

  // Don't try to reply with a second error response.
  if (this.replied === true) {
    return;
  }

  this.send({
    error : response
  });
};

Handler.prototype.reply = function(response) {
  this.send({
    result : response.getResult()
  }, response.getProperties());
};

Handler.prototype.send = function(response, properties) {
  if (this.replied === true) {
    throw new Error('Attempted to reply to a message twice');
  }

  this.replied = true;
  this.callback(null, response, properties);
};

module.exports = Handler;
