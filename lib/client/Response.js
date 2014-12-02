'use strict';

var _ = require('lodash');

function Response(payload) {
  this.content = payload.content;
  this.result = this.content.result;
  this.headers = payload.properties.headers;
  this.properties = _.omit(payload.properties, 'headers');
}

module.exports = Response;
