'use strict';

var Promise = require('bluebird');
var Request = require('./Request');
var Response = require('./Response');

function Handler(route, message) {
  this.route = route;
  this.message = message;
  this.request = null;

  this.replied = false;
}

Handler.prototype.handle = function() {
  try {
    this.request = new Request(this.message);
  } catch (validate) {
    return Promise.resolve(this.errorResponse({
      message : 'Bad request',
      code    : 400,
      data    : validate.error.details
    }));
  }

  var validateParams = this.route.validate(this.request.params);
  if (validateParams.error) {
    return Promise.resolve(this.errorResponse({
      message : 'Unprocessable entity',
      code    : 422,
      data    : validateParams.error.details
    }));
  }

  this.request.params = validateParams.value;

  return this._handle();
};

function BoomError(err) {
  return err.isBoom;
}

Handler.prototype._handle = function() {
  return Promise.try(this.route.handler, [ this.request ])
    .then(function sendResponse(response) {
      if (response instanceof Response) {
        return response;
      } else {
        return new Response(response);
      }
    }.bind(this))
    .catch(BoomError, function(err) {
      return this.errorResponse({
        name    : err.name,
        message : err.message,
        code    : err.output.statusCode
      });
    }.bind(this))
    .catch(function(err) {

      err.__harmoniaReply = this.errorResponse({
        name    : err.name,
        message : 'Internal server error',
        code    : 500,
        data    : err.message
      }).nack();

      throw err;
    }.bind(this));
};

Handler.prototype.errorResponse = function(content) {
  var response = new Response({
    headers : {},
    content : content
  });

  return response;
};

module.exports = Handler;
