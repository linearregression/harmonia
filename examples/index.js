'use strict';

var Harmonia = require('harmonia');

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

// Start the server
harmonia.listen('amqp://localhost');

// Make some requests using the Harmonia client
var client = Harmonia.Client.createClient('amqp://localhost', 'request', 'math.add');

client.call('math.add', { x : 15, y : 5 })
  .then(function(result) {
    console.log('add', result.content);
  });

client.call('math.subtract', { x : 15, y : 5 })
  .then(function(result) {
    console.log('subtract', result.content);
  });

client.call('math.divide', { x : 15, y : 5 })
  .then(function(result) {
    console.log('divide', result.content);
  });
