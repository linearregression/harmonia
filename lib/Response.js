'use strict';

var Message = require('./Message');

function Response(result) {
  this.result = result;
  this.headers = {};
  this.properties = {};

  this.disposition = 'ack';
}

Response.prototype.nack = function() {
  this.disposition = 'nack';
  return this;
};

Response.prototype.requeue = function() {
  this.disposition = 'requeue';
  return this;
};

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

Response.prototype.toMessage = function() {
  var headers = this.headers || {};
  headers['harmonia-message'] = '1.0';

  return new Message({
    properties : this.properties,
    headers : headers,
    content : {
      result : this.result
    }
  });
};

module.exports = Response;
