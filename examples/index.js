'use strict';

var Joi      = require('joi');
var Promise  = require('bluebird');

var Harmonia = require('harmonia');

// Create a new server that listens to a given queue
var harmonia = new Harmonia('rpc');

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

// Make some requests with Coyote (simpler client with less boilerplate coming soon!)
var Coyote = require('coyote');
var coyote = new Coyote('amqp://localhost', 'REQUEST', 'property');

coyote.on('response', function(response) {

  console.log(response);

});

coyote.on('ready', function() {
  coyote.write({
    method  : 'math.divide',
    params  : { x : 15, y : 0 },
    jsonrpc : '2.0'
  });

  coyote.write({
    method  : 'math.subtract',
    params  : { x : 5, y : 10 },
    jsonrpc : '2.0'
  });

  coyote.write({
    method  : 'math.add',
    params  : { x : 5, y : 10 },
    jsonrpc : '2.0'
  });
});
