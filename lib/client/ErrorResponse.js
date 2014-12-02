'use strict';

var _ = require('lodash');
var util = require('util');
var Response = require('./Response');

function ErrorResponse(payload) {
  // sets content, results, headers, properties on this
  Response.call(this, payload);
  delete this.result;

  var error = this.content.error;

  _.forIn(error, function(value, key) {
    if (key === 'isBoom') {
      return;
    }

    this[key] = value;
  }, this);

  if (! error.name) {
    this.name = 'ErrorResponse';
  }
}

util.inherits(ErrorResponse, Error);

module.exports = ErrorResponse;
