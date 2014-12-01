### 0.4

- `[ADDED]` - Support for clustering. Method handlers will run in pooled child processes. The master
process will manage the RabbitMQ connection and delegate jobs to children.
- `[CHANGED]` - The interface for `Server#route` no longer accepts `config` and has added `module`, `bootstrap`, and `concurrency`
- `[CHANGED]` - The server no longer handles multiple methods using a single queue as a namespace. Each method will receive its own queue.
- `[CHANGED]` - Client constructor accepts an AMQP connection instead of a connection string. This allows clients to reuse connections.
- `[ADDED]` - Added `createClient` factory method for ease of use.
