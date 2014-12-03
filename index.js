'use strict';

var Coyote = require('coyote');

exports.Server = require('./lib/Server');
exports.Client = require('./lib/Client');
exports.ErrorResponse = require('./lib/client/ErrorResponse');

exports.createAmqpConnection = function(amqpUrl, socketOptions) {
  return Coyote.createConnection(amqpUrl, socketOptions)
    .then(function(connection) {
      return connection;
    });
};
