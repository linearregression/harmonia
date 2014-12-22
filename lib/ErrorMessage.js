'use strict';

var _ = require('lodash');
var Message = require('./Message');

function ErrorMessage(obj) {
  obj = _.clone(obj);

  this.headers = {};
  this.properties = {};
  this.content = {
    error : {
      name : obj.name,
      message : obj.message,
      code : obj.code
    }
  };

  this.disposition = 'ack';
}

ErrorMessage.prototype.toMessage = function() {
  return new Message({
    properties : this.properties,
    headers : this.headers || {},
    content : this.content
  });
};

module.exports = ErrorMessage;
