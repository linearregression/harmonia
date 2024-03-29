### 2.1.0
- `[FIXED]` Improved handling of validation errors (#17)
- `[FIXED]` The client now rejects promises for failed calls using `awaitMethod` (#20)
- `[ADDED]` The client now has an option for default timeouts when using `awaitMethod` (#20)
  - The promise will be rejected after the timeout period; the message TTL will be set in RMQ as well
- `[ADDED]` A route's `validate` can now be a function, allowing you to use JSON Schema or other
  programmatic validation of messages. The function should return true or nothing at all; any other
  result will be considered a validation failure.

### 2.0.3
- `[FIXED]` Fixed a bug where handlers resolving with a non-stringifyable value caused messages to never get acked.

### 2.0.2
- `[FIXED]` Fixed a bug where messages with no reply-to that were automatically handled by Harmonia (rather than explicitly acked/nacked/requeued by the handler) were never actually acked.

### 2.0.1

- `[FIXED]` Fixed a regression where we stopped auto-replying with the promise's resolved value

### 2.0.0

- `[CHANGED]` Send header `harmonia-message=1.0` with all outbound messages
- `[CHANGED]` Message payload is now just the params at the top-level; does not include method
- `[CHANGED]` Response API no longer auto-replies with promise's resolved value; instead, you
  should call `request.reply()` with the value you want to send.
- `[ADDED]` Ability to specify a dead-letter exchange when creating a queue
- `[ADDED]` Client always specifies the message ID property when sending a message
- `[ADDED]` Ability to bind a queue to an exchange (asserts both the queue and the exchange)

Upgrade guide: https://github.com/colonyamerican/harmonia/commit/e2626600c4f1c1238fa1d7697ee442d25ba7b394

### 1.0.2
- `[FIXED]` Issue where errors were being formatted incorrectly by handlers
- `[MISC]` Miscellaneous refactoring (no public changes)

### 1.0.0 -> 1.0.1

- `[FIXED]` `Client#invokeMethod` returns a Bluebird promise
- `[FIXED]` Undefined error when `Client.createClient` promise does not return anything
- `[FIXED]` Error responses should have an `error` key as the top level

### 0.8.x -> 1.0.0

Changes

- `[REMOVED]` Built-in clustering
- `[CHANGED]` Response is no longer passed to handlers (just return your result, or if you need to set headers or nack/requeue, `return new Harmonia.Response()`
- `[CHANGED]` Response must be created with `new`. The way it was before was unreliable.
- `[REMOVED]` Dependency on `coyote` (now uses `amqplib` directly)
- `[CHANGED]` Route config (see readme)
- `[ADDED]` Response handler queues (for stateless applications)
- `[ADDED]` When a route receives a header named `x-state`, it will return it to the sender without modification
- `[CHANGED]` Client interface (see readme)

Notes:

- `Client#call` is deprecated (use the alias `Client#awaitMethod` instead).

### 0.4

- `[ADDED]` - Support for clustering. Method handlers will run in pooled child processes. The master
process will manage the RabbitMQ connection and delegate jobs to children.
- `[CHANGED]` - The interface for `Server#route` no longer accepts `config` and has added `module`, `bootstrap`, and `concurrency`
- `[CHANGED]` - The server no longer handles multiple methods using a single queue as a namespace. Each method will receive its own queue.
- `[CHANGED]` - Client constructor accepts an AMQP connection instead of a connection string. This allows clients to reuse connections.
- `[ADDED]` - Added `createClient` factory method for ease of use.
