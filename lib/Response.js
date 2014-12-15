'use strict';

var Message = require('./Message');

function Response(result) {
  this.result = result;
  this.headers = {};
  this.properties = {};
}

Response.prototype.setResult = function(result) {
  this.result = result;
  return this;
};

Response.prototype.setHeaders = function(headers) {
  this.headers = headers;
  return this;
};

Response.prototype.getProperties = function() {
  this.properties.headers = this.headers;
  return this.properties;
};

Response.prototype.getResult = function() {
  return this.result;
};

module.exports = Response;
