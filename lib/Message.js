'use strict';

var assert = require('assert');
var _ = require('lodash');
var schema = require('./schema');

function Message(obj) {

  assert(typeof obj === 'object', 'Message must be constructed with an object');

  obj = _.clone(obj);

  // Perform a quick convenience conversion, in case somebody forgot to convert
  // from what amqplib sends
  if ((obj.properties && obj.properties.headers) && ! obj.headers) {
    obj.headers = obj.properties.headers;
    delete obj.properties.headers;
  }

  if (Buffer.isBuffer(obj.content)) {
    obj.content = obj.content.toString('utf8');

    try {
      obj.content = JSON.parse(obj.content);
    } catch (err) {}
  }

  schema.assert(obj, schema.message);

  this.properties = obj.properties;
  this.headers = obj.headers;
  this.content = obj.content;

}

Message.prototype.format = function() {
  var props = _.clone(this.properties);

  props.headers = this.headers;

  var content = this.content;

  if (! Buffer.isBuffer(content)) {
    content = new Buffer(JSON.stringify(content));
  }

  return {
    properties : props,
    content : content
  };
};

module.exports = Message;
