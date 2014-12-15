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

  this.message = message;

  this.headers = message.headers;
  this.properties = message.properties;
  this.content = message.content;

  this.method = this.content.method;
  this.params = this.content.params;
}

Request.prototype.getHeaders = function() {
  return this.message.headers;
};

Request.prototype.getProperties = function() {
  return this.message.properties;
};

Request.prototype.getContent = function() {
  return this.message.content;
};

Request.prototype.getMethod = function() {
  return this.message.content.method;
};

Request.prototype.getParams = function() {
  return this.message.content.params;
};

module.exports = Request;
