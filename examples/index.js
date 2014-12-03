'use strict';

var amqpUrl = 'amqp://localhost';

var Promise = require('bluebird');
var Harmonia = require('../');

// Create a new server that listens to a given queue
var harmonia = new Harmonia.Server('rpc');

harmonia.route({
  method : 'math.add',
  module : './math/add.js'
});

harmonia.route({
  method : 'math.subtract',
  module : './math/subtract.js',
});

harmonia.route({
  method : 'math.divide',
  module : './math/divide.js',
});

harmonia.route({
  method : 'math.multiply',
  module : './math/multiply.js',
});

// Start the server
harmonia.listen(amqpUrl);

// Make some requests using the Harmonia client
var disposable = Harmonia.Client.createClient(amqpUrl, 'request');

// Make a bunch of calls in parallel and wait for all the results
Promise.using(disposable, function(client) {
  return Promise.using(
    client.queue('math.add'),
    client.queue('math.subtract'),
    client.queue('math.divide'),
    function(add, subtract, divide) {
      return Promise.join(
        client.call(add, { x : 15, y : 5 }),
        client.call(subtract, { x : 15, y : 5 }),
        client.call(divide, { x : 15, y : 5 }),
        function(addResult, subtractResult, divideResult) {
          console.log('add', addResult.content);
          console.log('subtract', subtractResult.content);
          console.log('divide', divideResult.content);
          return [ addResult, subtractResult, divideResult ];
        }
      );
    }
  ).spread(function(x, y, z) {
    // at this point, the add, subtract, and divide channels will be closed
    return Promise.using(client.queue('math.multiply'), function(multiply) {
      return client.call(multiply, { values : [ x.result, y.result, z.result ] })
        .then(function(multiplyResult) {
          console.log('multiply', multiplyResult.content);
        });
    });
  });
}).then(function() {
  // at this point, the rabbitmq connection will be closed
});

// Make a bunch of calls
