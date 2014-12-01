'use strict';

var Joi     = require('joi');
var assert  = require('assert');
var fs      = require('fs');
var path    = require('path');
var Coyote  = require('coyote');
var pool    = require('./pool');

var schema = Joi.object().keys({
  method      : Joi.string().min(1).required(),
  concurrency : Joi.number().min(1).optional(),
  bootstrap   : Joi.string().min(1).optional(),
  module      : Joi.string().min(1).required()
});

var moduleSchema = Joi.object().keys({
  handler  : Joi.func().required(),
  validate : Joi.object().optional()
});

function ClusteredRoute(config) {
  Joi.assert(config, schema, 'route');

  this.method      = config.method;
  this.module      = path.resolve(process.cwd(), config.module);
  this.bootstrap   = config.bootstrap ? path.resolve(process.cwd(), config.bootstrap) : false;
  this.concurrency = config.concurrency || 1;

  this.pool = pool(this.method, this.bootstrap, this.concurrency);

  assert(fs.existsSync(this.module), 'Could not find module at: ' + this.module);

  if (this.bootstrap) {
    assert(fs.existsSync(this.module), 'Could not find bootstrap at: ' + this.module);
  }

  Joi.assert(require(this.module), moduleSchema, 'routeModule');

  if (! this.validation) {
    this.validation = Joi.any().optional();
  }

  this.coyote = null;
}

ClusteredRoute.validate = function(config) {
  return Joi.validate(config, schema, 'route');
};

ClusteredRoute.prototype.validate = function(params) {
  return Joi.validate(
    params,
    this.validation.options({
      language : { root : 'params' }
    }),
    {
      abortEarly   : false,
      stripUnknown : true,
      presence     : 'required'
    }
  );
};

ClusteredRoute.prototype.onMessage = function(message, callback) {
  this.pool.acquireAsync()
    .bind(this)
    .then(function(child) {
      child.once('message', function(response) {
        this.pool.release(child);
        callback(null, response.content, response.properties);
      }.bind(this));

      var payload = {
        method : this.method,
        module : this.module,
        message : message
      };

      if (this.bootstrap) {
        payload.bootstrap = this.bootstrap;
      }

      child.send(payload);
    });
};

ClusteredRoute.prototype.start = function(connection, type) {
  this.coyote = new Coyote(connection, type, this.method);

  this.coyote.on('message', this.onMessage.bind(this));
};

module.exports = ClusteredRoute;
