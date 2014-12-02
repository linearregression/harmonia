'use strict';

var Coyote = require('coyote');

exports.Server = require('./lib/Server');
exports.Client = require('./lib/Client');
exports.ErrorResponse = require('./lib/client/ErrorResponse');

exports.createAmqpConnection = function(amqpUrl) {
  return Coyote.createConnection(amqpUrl)
    .then(function(connection) {
      return connection;
    });
};
