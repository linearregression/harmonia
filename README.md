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
      - `bindToExcahnges` - An array of objects describing exchanges to bind to. **Warning:** the exchange will be
        asserted, so make sure any existing exchanges on your RMQ server have matching settings.
        - `exchange` - the name of the exchange to bind your queue to
        - `type` - the type of the exchange (`direct`, `fanout`, `topic`, `headers`)
        - `routingKey` - the routing key to bind to the exchange with
      - `deadLetterExchange` - the dead letter exchange for this queue
      - `concurrency` - This is the AMQP prefetch (how many messages will be delivered from the queue at once)
      - `config` - an object containing the configuration for the handler
        - `onError` - one of `ack`, `nack`, or `requeue`. This is the action taken on a message when a runtime error occurs that reaches Harmonia
        - `handler` - your method handler. This function must return a promise. Receives a `Request` object as its only parameter.
        - `validate` - can either be a `Joi` object or a function (receives the incoming message as its only parameter)
          - if a function is provided, it should return true or undefined to indicate successful validation. Throwing any error
            or returning any value other than true will be treated as a validation failure.
        - `invalidMessageHandler` - allows you to react to invalid messages (or override their default handling)
  - `#listen` - Start listening to the configured queues on the given AMQP server
  - `#shutdown` - Stop handling new messages and disconnect (any requests in progress will be completed)

### Client
  - `#constructor`
    - `channel` - an established AMQP channel
    - `options` - an object. Currently, the only option is `timeout` for RPC-style calls (timeout in ms or false for no timeout)
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

**Note on timeouts:** you can set a default timeout by overriding `Client.defaultTimeout`.
The default timeout is initialized to false in order to preserve backward-compatibility, but it
is highly recommended to set this to a value, even if it is long. If a remote service nacks a message
or simply fails to reply, you **will** leak memory, both in your Harmonia application and on the
RabbitMQ server (a reply queue, a channel, and a connection that will not be cleaned up until your
application restarts).


## Examples

See the `examples` directory
