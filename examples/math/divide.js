'use strict';

var Joi = require('joi');

function handler(request, response) {
  if (request.params.y === 0) {
    throw require('boom').badRequest('Divide by 0 error');
  }

  return response(request.params.x / request.params.y).setHeaders({
    'Powered-By' : 'Harmonia'
  });
}

module.exports = {
  handler  : handler,
  validate : Joi.object().keys({
    x : Joi.number(),
    y : Joi.number()
  })
};
