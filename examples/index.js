'use strict';

var Joi      = require('joi');
var Promise  = require('bluebird');

var Harmonia = require('harmonia');

// Create a new server that listens to a given queue
var harmonia = new Harmonia.Server('rpc');

harmonia.route({
  method : 'math.add',
  config : {
    handler : function(request, response) {

      return response(request.params.x + request.params.y);

    },
    validate : Joi.object().keys({
      x : Joi.number(),
      y : Joi.number()
    })
  }
});

harmonia.route({
  method : 'math.subtract',
  config : {
    handler : function(request) {

      return Promise.delay(500).then(function() {
        return request.params.x - request.params.y;
      });

    },
    validate : Joi.object().keys({
      x : Joi.number(),
      y : Joi.number()
    })
  }
});

harmonia.route({
  method : 'math.divide',
  config : {
    handler : function(request, response) {
      if (request.params.y === 0) {
        throw require('boom').badRequest('Divide by 0 error');
      }

      return response(request.params.x / request.params.y).setHeaders({
        'Powered-By' : 'Harmonia'
      });
    },
    validate : Joi.object().keys({
      x : Joi.number(),
      y : Joi.number()
    })
  }
});

// Start the server
harmonia.listen('amqp://localhost');

// Make some requests using the Harmonia client
var Client = require('./lib/Client');
var client = new Client('amqp://localhost', 'rpc', 'request');

client.callMethod('math.add', { x : 15, y : 5 })
  .then(function(result) {
    console.log('add', result.content);
  });

client.callMethod('math.subtract', { x : 15, y : 5 })
  .then(function(result) {
    console.log('subtract', result.content);
  });

client.callMethod('math.divide', { x : 15, y : 5 })
  .then(function(result) {
    console.log('divide', result.content);
  });
