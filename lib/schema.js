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
  bindToExchanges : Joi.array().includes(Joi.object().keys({
    exchange : Joi.string(),
    type : Joi.valid('topic', 'fanout', 'direct', 'headers'),
    routingKey : Joi.string(),
  })).optional(),
  deadLetterExchange : Joi.string().optional(),
  concurrency : Joi.number().min(1).optional(),
  response : Joi.boolean().default(false).optional(),
  config : Joi.object().keys({
    onError : Joi.valid('ack', 'nack', 'requeue').default('nack'),
    handler : Joi.func().required(),
    validate : Joi.alternatives().try(
      Joi.object(),
      Joi.func()
    ).optional(),
    invalidMessageHandler : Joi.func().optional(),
  }).required()
});

exports.request = Joi.object().keys({
  method : Joi.string().min(1),
  params : Joi.object().unknown().optional()
});

exports.messageProperties = Joi.object().required().keys({
  headers : Joi.object().unknown(),
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
}).options({ presence : 'optional' }).unknown();

exports.messageFields = Joi.object().keys({
  consumerTag : Joi.string(),
  deliveryTag : Joi.number(),
  redelivered : Joi.boolean(),
  exchange : Joi.string().allow('').optional(),
  routingKey : Joi.string()
});

exports.assert = Joi.assert;
exports.validate = Joi.validate;
