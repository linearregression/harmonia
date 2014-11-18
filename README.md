# Harmonia

Harmonia is a RabbitMQ-backed RPC server. Its API is inspired by [HapiJS](http://hapijs.org)
and is designed to work with many of the Hapi components (currently Joi and Boom are supported
for validation and errors, respectively).

## API

### Harmonia

  - `#constructor`
    - `queue` - The queue to consume messages from
  - `#route`
    - `config` - An object of the following format representing a method handler
      - `method` - A string representing the RPC method name
      - `config` - object
        - `handler` - A callback that will handle each request to the given method
          - `request` - An object representing the request (see the request object)
          - `response` - An object representing the response (see the response object)
        - `validate` - *optional* a Joi schema to be used to validate the request params
  - `#listen` - Start listening to the configured queue on the given AMQP server
    - `amqpUrl` - e.g. `amqp://username:password@localhost:5672`
  - `#pause` - Pause receipt of new requests (any requests in progress will be completed)
  - `#resume` - Resume handling of new requests
  - `#shutdown` - Stop handling new messages and disconnect

### Request
*Note:* this class has no public methods. Its properties should not be mutated.

  - `headers` - an object containing the AMQP headers
  - `properties` - an object containing the AMQP message properties
  - `content` - an object containing the raw message content
  - `method` - the requested method
  - `params` - the request params

### Response

  - `#constructor` - can be called with or without `new`, accepts one param
    - `result` - Must be a stringifiable object or scalar
  - `#setResult` - override the result previously set
  - `#setHeaders` - set the response headers
    - `headers` - object

## Examples

See the `examples` directory
