'use strict';

var Joi = require('joi');

exports.server = Joi.object().keys({
  amqpUrl : Joi.string(),
  socketOptions : Joi.object().optional().keys({
    clientProperties : Joi.object().optional().unknown().keys({
      Application : Joi.string().optional()
    })
  }).unknown()
});

exports.route = Joi.object().keys({
  method : Joi.string().min(1).required(),
  concurrency : Joi.number().min(1).optional(),
  response : Joi.boolean().default(false).optional(),
  config : Joi.object().keys({
    handler : Joi.func().required(),
    validate : Joi.object().optional()
  }).required()
});

exports.request = Joi.object().keys({
  method : Joi.string().min(1),
  params : Joi.object().unknown().optional()
});

exports.message = Joi.object().keys({
  headers : Joi.object().required().unknown(),

  properties : Joi.object().required().keys({
    expiration : Joi.string(),
    userId : Joi.string(),
    CC : Joi.string(),
    BCC : Joi.string(),
    mandatory : Joi.boolean(),
    persistent : Joi.boolean(),
    contentType : Joi.string(),
    contentEncoding : Joi.string(),
    priority : Joi.number(),
    correlationId : Joi.string(),
    replyTo : Joi.string(),
    messageId : Joi.string(),
    timestamp : Joi.number().min(0),
    type : Joi.string(),
    appId : Joi.string()
  }).options({ presence : 'optional' }).unknown(),

  fields : Joi.object().keys({
    consumerTag : Joi.string(),
    deliveryTag : Joi.number(),
    redelivered : Joi.boolean(),
    exchange : Joi.string().allow('').optional(),
    routingKey : Joi.string()
  }),

  content : Joi.any().required()
});

exports.assert = Joi.assert;
exports.validate = Joi.validate;
