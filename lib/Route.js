'use strict';

var Joi = require('joi');

var schema = Joi.object().keys({
  method : Joi.string().min(1).required(),
  config : Joi.object().keys({
    handler  : Joi.func().required(),
    validate : Joi.object().optional()
  }).required()
});

function Route(config) {
  Joi.assert(config, schema, 'route');

  this.method     = config.method;
  this.handler    = config.config.handler;
  this.validation = config.config.validate;

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

module.exports = Route;
