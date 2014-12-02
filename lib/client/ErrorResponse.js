'use strict';

var util = require('util');
var Response = require('./Response');

function ErrorResponse(payload) {

  // sets content, results, headers, properties on this
  Response.call(this, payload);

  this.error = this.content.error;
  this.code = this.content.error.code;
  this.data = this.content.error.data;

  Error.call(this, this.error.message);

  this.name = 'ErrorResponse';
  this.message = this.error.message;
}

util.inherits(ErrorResponse, Error);

module.exports = ErrorResponse;
