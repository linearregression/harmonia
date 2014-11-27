'use strict';

var Joi     = require('joi');
var Promise = require('bluebird');

function handler(request, response) {
  return Promise.delay(500).then(function() {
    return request.params.x - request.params.y;
  });
}

module.exports = {
  handler  : handler,
  validate : Joi.object().keys({
    x : Joi.number(),
    y : Joi.number()
  })
};
