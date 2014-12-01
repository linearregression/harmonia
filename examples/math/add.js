'use strict';

var Joi = require('joi');

function handler(request, response) {
  return response(request.params.x + request.params.y);
}

module.exports = {
  handler  : handler,
  validate : Joi.object().keys({
    x : Joi.number(),
    y : Joi.number()
  })
};
