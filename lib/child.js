'use strict';

// need to add a way to bootstrap stuff

var Route = require('./Route');

process.once('message', function(message) {
  if (message.bootstrap) {
    require(message.bootstrap);
  }

  process.on('message', function(message) {
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
  });
});

process.send('ready');
