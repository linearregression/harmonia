# Harmonia

Harmonia is a RabbitMQ-backed RPC server. Its API is inspired by [HapiJS](http://hapijs.org)
and is designed to work with many of the Hapi components (currently Joi and Boom are supported
for validation and errors, respectively).

## API

### Harmonia

  - `#constructor`
    - `options` - a configuration object
      - `amqpUrl` - e.g. `amqp://username:password@localhost:5672`
      - `socketOptions` - any socket option that can be passed to [`amqplib.connect`](http://www.squaremobius.net/amqp.node/doc/channel_api.html)
  - `#route`
    - `route` - An object of the following format representing a method handler
      - `method` - A string representing the RPC method name (will also be the queue name)
      - `concurrency` - This is the AMQP prefetch (how many messages will be delivered from the queue at once)
      - `response` - *optional* Indicates that this handler is a response queue (for being used as a replyTo queue). *Default: false*
      - `config` - an object containing the configuration for the handler
        - `onError` - one of `ack`, `nack`, or `requeue`. This is the action taken on a message when a runtime error occurs that reaches Harmonia
        - `handler` - your method handler. This function must return a promise. Receives a `Request` object as its only parameter.
        - `validate` - can either be a `Joi` object or a function (receives the incoming message as its only parameter)
          - if a function is provided, it should return true or undefined to indicate successful validation. Throwing any error
            or returning any value other than true will be treated as a validation failure.
  - `#listen` - Start listening to the configured queues on the given AMQP server
  - `#shutdown` - Stop handling new messages and disconnect (any requests in progress will be completed)

### Request
*Note:* this class has no public methods. Its properties should not be mutated.

  - `headers` - an object containing the AMQP headers
  - `properties` - an object containing the AMQP message properties
  - `content` - an object containing the raw message content
  - `method` - the requested method
  - `params` - the request params

### Response

You may optionally return a response object from your handler in order to supply response headers or to nack/requeue a message.

  - `#constructor`
    - `result` - Must be a stringifiable object or scalar
  - `#setResult` - override the result previously set
  - `#setHeaders` - set the response headers
    - `headers` - object
  - `#nack` - indicates that the message will be nacked (no response will be sent)
  - `#requeue` - indicates that the message will be requeued (no response will be sent)

### Client
  - `#constructor`
    - `channel` - an established AMQP channel
  - `#createClient` - client factory; gives you a client to work with and disposes it (and the channel and connection when finished)
    - `amqpUrl` - used to create a connection to the server
    - `callback` - a function that will receive the established `client` object. **Must return a promise. The client will be disposed when this promise is resolved.**
  - `#createConnection` - create a disposable AMQP connection (for use with Bluebird's `Promise.using`)
  - `#createChannel` - creates a disposable channel on the given connection (again, for use with Bluebird's `Promise.using`)
  - `#awaitMethod` - RPC-style method call. **DO NOT use this method for multiple calls to the same method**.
    - `method` - the rpc method to call
    - `params` - the parameters to the rpc method
    - `options` - any options that can be sent to amqplib's `Channel#sendToQueue`
  - `#call` - **deprecated** - alias of `#awaitMethod`
  - `#awaitMethodBulk` - same as `awaitMethod` except `params` is an array of objects, each item in the array being a separate invokation
  - `#invokeMethod` - invoke a method, but don't wait for a response (promise resolves when the message broker has received the message)

## Examples

See the `examples` directory
