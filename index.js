'use strict';

var Promise = require('bluebird');
var amqp = require('amqplib');

exports.Server = require('./lib/Server');
exports.Client = require('./lib/Client');
exports.ErrorResponse = require('./lib/client/ErrorResponse');

exports.createAmqpConnection = function(amqpUrl, socketOptions) {
  return Promise.resolve(amqp.connect(amqpUrl, socketOptions));
};
