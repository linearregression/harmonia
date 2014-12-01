'use strict';

// need to add a way to bootstrap stuff

var Route = require('./Route');

function handle(message) {
  var config = require(message.module);

  var route = new Route({
    method : message.method,
    config : config
  });

  route.onMessage(message.message, function(err, content, properties) {
    process.send({
      content    : content,
      properties : properties
    });
  });
}

process.once('message', function(message) {
  if (message.bootstrap) {
    require(message.bootstrap);
  } else {
    handle(message);
  }

  process.on('message', handle);
});

process.send('ready');
