'use strict';

var schema = require('./schema');

function Request(message) {

  var validate = schema.validate(message.content, schema.request, {
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
