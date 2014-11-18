'use strict';

function Response(result) {
  if (! this || ! this instanceof Response) {
    return new Response(result);
  }

  this.result     = result;
  this.headers    = {};
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

Response.prototype.setAppId = function(appId) {
  this.properties.appId = appId;
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
