'use strict';

var _ = require('lodash');

function compact(obj) {
  return _.transform(obj, function(result, val, key) {
    if (val) {
      result[key] = val;
    }
  });
}

function Response(payload) {
  this.content = payload.content;

  if (Buffer.isBuffer(this.content)) {
    this.content = this.content.toString('utf8');

    try {
      this.content = JSON.parse(this.content);
    } catch (err) {}
  }

  this.result = this.content.result;
  this.headers = payload.properties.headers;
  this.properties = compact(_.omit(payload.properties, 'headers'));
}

module.exports = Response;
