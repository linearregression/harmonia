'use strict';

var Pool    = require('generic-pool');
var Promise = require('bluebird');
var path    = require('path');
var fork    = require('child_process').fork;

function createChild(bootstrap, callback) {
  var childScript = path.join(__dirname, 'child.js');

  var child = fork(childScript, [], {
    cwd : process.cwd(),
    env : process.env
  });

  var onReady = function(message) {
    if (message === 'ready') {
      callback(null, child);
    }

    if (bootstrap) {
      child.send({
        bootstrap : bootstrap
      });
    }
    child.removeListener('message', onReady);
  };

  child.on('message', onReady);
}

function destroyChild(child) {
  if (child.pid || child.connected) {
    child.kill();
  }
}

function validateChild(child) {
  return child.pid && child.connected;
}

module.exports = function createPool(method, bootstrap, max) {
  var pool = Pool.Pool({
    name              : method,
    create            : createChild.bind(undefined, bootstrap),
    destroy           : destroyChild,
    validate          : validateChild,
    max               : max,
    min               : 1,
    refreshIdle       : true,
    idleTimeoutMillis : 30000
  });

  return Promise.promisifyAll(pool);
};
