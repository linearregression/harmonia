'use strict';

var _ = require('lodash');
var Joi = require('joi');

function handler(request, response) {

  return response(_.reduce(request.params.values, function(total, val) {
    return total * val;
  }, 1));

}

module.exports = {
  handler  : handler,
  validate : Joi.object().keys({
    values : Joi.array()
  })
};
