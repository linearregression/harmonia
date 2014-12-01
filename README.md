# Harmonia

Harmonia is a RabbitMQ-backed RPC server. Its API is inspired by [HapiJS](http://hapijs.org)
and is designed to work with many of the Hapi components (currently Joi and Boom are supported
for validation and errors, respectively).

## API

### Harmonia

  - `#constructor`
    - `type` - *optional* 'rpc' or 'worker'; the only major difference is that in rpc mode,
    the server will return your response data to the requster. In worker mode, the response
    data will be ignored and the message will just be acknowledged.
  - `#route`
    - `config` - An object of the following format representing a method handler
      - `method` - A string representing the RPC method name (will also be the queue name)
      - `module` - Path to the module that will handle these requests. See `Handler` below
      - `bootstrap` - *optional* Path to a script that will be required before the handler module
      - `concurrency` - *optional* Maximum number of child processes that will be run at once (default 1)
  - `#listen` - Start listening to the configured queues on the given AMQP server
    - `amqpUrl` - e.g. `amqp://username:password@localhost:5672`
  - `#pause` - Pause receipt of new requests (any requests in progress will be completed)
  - `#resume` - Resume handling of new requests
  - `#shutdown` - Stop handling new messages and disconnect

### Handler
This module will be executed in a child process and thus, will not have any resources (database, network, files, etc.)
that have been set up in the master process. It is recommended you use a bootstrap script to set up any resources a
handler might need (to separate the handler code from resource setup).

This module should export an object with the following properties:
  - `handler` - a function that will be called to handle a method call. It will be passed two arguments and should return either a `Response` or a Promise.
    - `request` - see `Request`
    - `response` - see `Response`
  - `validate` - a `Joi` schema that will be used to validate the parameters passed to the method on each call

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

### Client
  - `#constructor`
    - `connection` - an established AMQP connection (a new channel will be created on this connection)
    - `type` - one of `request`, `push`, or `publish`
  - `#createClient` - client factory; returns a promise that will be resolved with a client instance
    - `amqpUrl` - used to create a connection to the server
    - `type` - passed to `Client#constructor`
  - `#call` - make an rpc call
    - `method` - the rpc method to call
    - `params` - the parameters to the rpc method

## Examples

See the `examples` directory
