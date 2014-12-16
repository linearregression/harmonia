### 0.8.x -> 0.9.x

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
