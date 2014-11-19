'use strict';

var _   = require('lodash');
var Joi = require('joi');

var generalRequestSchema = Joi.object().keys({
  method  : Joi.string().min(1),
  params  : Joi.object().unknown().optional(),
  jsonrpc : Joi.string().valid('2.0').required()
});

function Request(obj) {
  var validate = Joi.validate(obj.content, generalRequestSchema, {
    abortEarly   : false,
    stripUnknown : true,
    presence     : 'required'
  });

  if (validate.error) {
    throw validate;
  }

  this.headers    = obj.properties.headers;
  this.properties = _.omit(obj.properties, 'headers');
  this.content    = obj.content;

  this.method = this.content.method;
  this.params = this.content.params;
}

module.exports = Request;
