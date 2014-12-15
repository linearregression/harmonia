'use strict';

var Joi     = require('joi');
var Coyote  = require('coyote');
var Handler = require('./Handler');
var schema = require('./schema');

function Route(server, config) {
  this.server = server;

  Joi.assert(config, schema.route, 'route');

  this.method     = config.method;
  this.handler    = config.config.handler;
  this.validation = config.config.validate;

  if (! this.validation) {
    this.validation = Joi.any().optional();
  }

  this.coyote = null;
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

Route.prototype.onMessage = function(message, callback) {
  var handler = new Handler(this, message, callback);
  handler.handle();
};

Route.prototype.start = function(connection, type) {
  this.coyote = new Coyote(connection, type, this.method);

  this.coyote.on('message', this.onMessage.bind(this));
};

module.exports = Route;
