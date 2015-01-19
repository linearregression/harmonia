'use strict';

var amqpUrl = 'amqp://192.168.59.103';

var _ = require('lodash');
var Promise = require('bluebird');
var Joi = require('joi');
var Harmonia = require('../');

// Create a new server that listens to a given queue
var harmonia = new Harmonia.Server({
  amqpUrl : amqpUrl,
  socketOptions : {
    clientProperties : {
      Application : 'Harmonia Example'
    }
  }
});

harmonia.route({
  method : 'math.add',
  concurrency : 50,
  config : {
    handler : function(request) {
      return request.reply(request.params.x + request.params.y)
    },
    validate : Joi.object().keys({
      x : Joi.number(),
      y : Joi.number()
    })
  }
});

harmonia.route({
  method : 'math.subtract',
  concurrency : 50,
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
  concurrency : 50,
  config : {
    handler  : function(request) {
      if (request.params.y === 0) {
        throw require('boom').badRequest('Divide by 0 error');
      }

      return request.reply(request.params.x / request.params.y, {
        'Powered-By' : 'Harmonia'
      });
    },
    validate : Joi.object().keys({
      x : Joi.number(),
      y : Joi.number()
    })
  }
});

harmonia.route({
  method : 'math.multiply',
  concurrency : 50,
  config : {
    handler  : function(request) {
      return request.reply(request.params.x * request.params.y);
    },
    validate : Joi.object().keys({
      x : Joi.number(),
      y : Joi.number()
    })
  }
});

harmonia.route({
  method : 'math.result.add',
  response : true,
  concurrency : 50,
  config : {
    handler : function(request) {
      console.log('result-queue', request.content);
      return request.ack();
    }
  }
});

// Start the server
harmonia.listen();

Harmonia.Client.createClient(amqpUrl, function(client) {
  // You must return a promise from this method or the conection and channel
  // will be disposed before you can do anything with them

  // Client#awaitMethod is great for one-off RPC-style calls. Behind the scenes,
  // it creates an auto-named, exclusive, auto-delete reply queue for use as its
  // replyTo.
  return Promise.join(
    client.awaitMethod('math.add', { x : 15, y : 5 }),
    client.awaitMethod('math.subtract', { x : 15, y : 5 }),
    client.awaitMethod('math.multiply', { x : 15, y : 5 }),
    client.awaitMethod('math.divide', { x : 15, y : 5 }),
    function(add, subtract, multiply, divide) {
      console.log('add', add.content);
      console.log('subtract', subtract.content);
      console.log('multiply', multiply.content);
      console.log('divide', divide.content);
    }
  ).then(function() {
    // If you need to make many RPC-style calls to the same method, then you should
    // use Client#awaitMethodBulk, as the single #awaitMethod will create many reply
    // anonymous reply queues, whereas using the bulk method will only create one.
    // Behind the scenes, #awaitMethod simply calls #awaitMethodBulk with a single
    // parameter list and returns the first result.
    //
    // awaitMethodBulk uses Promise.settle on the result set, so be sure to check
    // each result for errors

    return client.awaitMethodBulk('math.add', [
      { x : 1, y : 2 },
      { x : 3, y : 4 },
      { x : 5, y : 6 },
      { x : 7, y : 8 }
    ]).then(function(results) {
      // results[0].result = 3
      // results[1].result = 7
      // ...
      //
      console.log('bulkResult', _.pluck(results, 'content'));
    });
  }).then(function() {
    // If your application is stateless, or you simply don't care about the result
    // of a method call, you can use Client#invokeMethod, which will resolve immediately
    // once the messages have been accepted by the message broker. Since no new queues
    // or channels are created, it is not necessary to use a bulk version of this method
    // for multiple calls.

    return client.invokeMethod('math.add', { x : 15, y : 5 });
  }).then(function() {
    // You can pass a replyTo queue in the options parameter to #invokeMethod, which
    // will prompt a Harmonia server on the other side to publish the response to
    // the named queue.

    return client.invokeMethod('math.add', { x : 15, y : 5 }, {
      replyTo : 'math.result.add'
    });
  });
}).then(function() {
  // At this point, the client is disposed and all of our messages have been sent,
  // and any replies (if we are expecting them) will have been received
  harmonia.shutdown();
});
