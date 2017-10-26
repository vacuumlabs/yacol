# Basic semantics
- async function are transformed, so instead of standard Promise they returns (so called) Coroutine
- Coroutine is Promise-like object (it's .then-able and .catch-able), but the following:
- All the async functions which are called within a given Coroutine produce child Coroutines.
- If any child Coroutine errors, the error is propagated to it's parent, grandparend, etc..
- Parent can catch errors on child coroutine by try-catch block. The child Coroutine must be
  awaited inside try-block, otherwise, try-catch has no effect on error and it propagates to further
  parents
- Coroutine terminates only after all children Coroutine are terminated
- If coroutine is killed, no more commands from it will be executed. Furthermore, all it's (direct and transitive) children are also killed.

# Coroutine object

All methods which modifies how coroutine work may be called only before the coroutine start. Once started, the
options are freezed so the semantics of running coroutine is clear.

### coroutine.toPromise()
Converts coroutine to Promise

### coroutine.then(fn)
Converts coroutine to Promise and attach .then handler

### coroutine.catch()
Converts coroutine to Promise and attach .catch handler

### coroutine.name(label)
Name the coroutine. Useful mostly for debugging.

### coroutine.getName()

### coroutine.onKill(callback)
Advanced stuff. Register callback which will be executed, if the coroutine was killed (directly, or
as a result of its parent being killed)

### coroutine.detach()
Overriding the default coroutine parent, create new root coroutine. Errors are not being propagated
'up the tree', so take care, what you are doing!

# Misc

### yacol.kill(coroutine)
Immediately terminate the coroutine, it's children, grandchildren, etc. Current work (i.e. ongoing
fetch) will continue, but no more computation and no more side-effects will happen in any children.
If you are writing your own version of e.g. fetch, you can use `onKill` handler to terminate the
ongoing work.

### yacol.race({key1: coroutine1, key2: coroutine2, ...})
Returns a coroutine that completes with the value that comes first. Returns `[key, result]`,

### yacol.currentCoroutine()
Returns currently running coroutine. Grabbing such reference is usually not needed, but may be handy
for example for calling .withParent.

### yacol.prettyErrorLog(error)
This displays error in a nice fashion. It
- displays stacktrace info for all the coroutines which parents the errored one
- filters out yacol internal stacktrace lines

# Context

### context.set(key, val)
Sets `key` to `val` in the current coroutine's context. `key` can be any object; the underlying
implementation uses ES6 Map, which implies the logic of keys equality during `get`/`set`.

### context.get(key, val)
Reads value associated with `key` in the current coroutine's context. If the value is not found, the
`key` is looked up in the parent's context, then in the grandparent's context and so on. If the `key` is
not found anywhere, `undefined` is returned.

# Messaging

There are a few differences to standard CSP implementations, and a few things you should know:
- channels cannot be closed and cannot be in error state. Channel is simply a pipe which exists
  until someone keeps a reference to it. You don't want to have the channel anymore? Just forget
  it and GC will take care of it.

- putting messages to channels is always a synchronous operation (you don't have to yield
  `channel.put()`). In other words, yacol will never block you on this operation. The reason behind
  this decision is more fundamental: In multithreading environment it might make sense to block the
  producer (thread), if the consumer (thread) does not keep with its pace. However, in JS there are
  no multiple threads, and the eventloop architecture ensures that every callback will eventually
  happen, so it does not make sense to block it. The best you can do is put the relevant data to the
  channel and let it be processed later.

- only one take can be "waiting" on a single channel at one time. If there were multiple takes, this
  basically implies that there is race-condition for who will consume the message first. This may be a
  good thing (only) if multiple workers (doing the same thing) race for who will be available first.
  In single-threaded node environment, we see no use for it.

- the channels play nice with transducers. When you use a transducer for creating some channel, that
  means that this transducer will be used on `put` operation to that channel. Yacol uses the most
  popular implementation of the concept:
  [https://github.com/cognitect-labs/transducers-js](https://github.com/cognitect-labs/transducers-js).
  If you want to use transducers, don't forget to `npm install transducers-js`. Yacol does not list
  `transducer-js` as its dependency (for obvious reasons) nor as its peer dependency (until someone
  explains to me how peer dependencies work exactly).

### createChannel([transducer])
Creates channel (not bounded to any capacity).

### channel.put(message)
Puts message to channel. The operation is non-blocking

### await channel.take()
Obtains a value from channel. If there is no value, it blocks until a value is available.

# Advanced messaging concepts

### yacol.droppingChannel(capacity, transducer = null)
Creates channel which drops any new message if the capacity is reached.

### yacol.slidingChannel(capacity, transducer = null)
Creates channel which drops old messages if the capacity is reached.

### yacol.mult(channel)
Used for publish-subscribe. Returns object referred to as `multObj` below. Note that `mult` consumes
all messages that come to channel (refered to as 'source channel' below), so no one should take out of
source channel until mult is `.stop`ped.

### multObj.subscribe(channel = null, transducer = null)
Put every message that comes to `mult` source channel to the given channel. If transducer is
specified, it will be applied. If channel is not specified, it will create a new standard (i.e. unbounded)
channel. This channel (whether constructed or obtained) is returned.

This function can be called with any combination of arguments (you can for example omit channel but
provide transducer). Since channels are quite easily distinguishable from other objects, this is not
a mess.

### multObj.unsubscribe(channel)
Unsubscribe channel from `mult`.

### multObj.stop()
Stop broadcasting the messages and release the original channel.

### yacol.merge([channel1, channel2, ...], transducer = null, output = null)
pipes all messages from channels into one output channel. Similarly as in `mult`, if the output channel is not
provided, it is constructed (and returned). Similarly as in `mult`, you can specify any combination of
`transducer` and `output` params.

### yacol.mergeNamed({key1: channel1, key2: channel2, ...}, transducer = null, output = null)
Same as merge, but the resulting channel will contain `[key_i, msg]`, where `key_i` identifies the
channel from which the message comes from.

