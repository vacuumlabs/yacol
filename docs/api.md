# Coroutines

### yacol.run(fn, ...args)
Returns Coroutine object. `fn(...args)` should return either a generator (i.e. `fn`
should be a generator function) or a Promise.

In the generator which is used for spawning a coroutine, writing `var value = yield something` means
that the execution should pause at the current line, until the asynchronous value is obtained. You
can yield:

- Coroutine. In such a case, value will be the return value of the yielded coroutine.
- Promise. The value will be the value with what the promise fulfilled.

Errors from a Coroutine / Promise are propagated to the current coroutine. See [error handling](https://github.com/vacuumlabs/yacol/blob/master/docs/features.md#error-handling) section.

### yacol.runc(fn, ...args)
Creates coroutine from node-style-callback accepting function `fn`. Yacol expects, that `fn(...args,
cb)` will execute callback with two arguments: Error (if any) and result of the asynchronous
calculation. For example
`const buf = yield runc(fs.readFile, filename)`
reads the file into buffer.

### yacol.kill(coroutine)

The coroutine and all its children, grandchildren, etc, will stop doing their work. The current
async operations in progress (i.e. network request in progress) will finish (as there is no way to
terminate them nicely), however the resulting values of these will be discarded and no more work
will be performed.

# Coroutine object

### const val = yield coroutine
Blocks until the `coroutine` and all its spawned child-coroutines finish. Then the `val` will take the
value returned by the `coroutine`. If `coroutine` (or any child coroutines) produce an error which is
not handled by `.catch` handler, this error will be propagated to the current coroutine (even if the
current coroutine is not a parent of `coroutine`). If you wish to yield from coroutine which may
produce unhandled errors, you can catch those errors and provide on-error return value (in this case 47):

```javascript
const res = yield run(function*() {
  return (yield coroutine)
}).catch((e) => 47)
```

### coroutine.then(fn)
In a Promise-like fashion, `fn` is executed when the coroutine finished. Calling `.then` returns a
new Promise, so you cannot chain `.then` with for example `.inspect` (in this order). Usually, you
don't need to `.then` coroutines, the feature is useful mostly when you want to integrate coroutines
with some code that expects Promise; for example, coroutine can be returned by a Mocha test.

### coroutine.catch(handler)
Attaches error handler to the `coroutine`. Handler should be of a type `(err) => returnValue`. Once
the bubbling error meets the `.catch` handler, the error bubbling is stopped  and the `coroutine` is
assumed to be done with a given `returnValue`. This means that `coroutine`s parent won't ever know
about the error. Catching the error also affects other coroutines which may yield from `coroutine`.
These coroutines will observe `returnValue` as a proper value returned by a `coroutine`.

Returns the same Coroutine on which this was called.

### coroutine.inspect()
Turn on the inspect mode. In the inspect mode, you can call `.step()` and `.takeEffect()` on the
Coroutine. Returns the same Coroutine on which this was called.

### yield coroutine.takeEffect()
Only available in inspect mode. `cor.takeEffect()` yields the object describing what
`cor` tries to do. This object can take different forms as described below. Note that
`channel.takeEffect` is internally just `.take` on internal `channel.effects` channel.

If `cor` tries to yield sub-coroutine, `takeEffect()` will yield:
```
{
  runnable: first argument of run,
  args: rest of the arguments of run,
}
```
If `cor` tries to yield Promise object, `takeEffect()` will yield:
```
{
  promise: yielded promise object
}
```
If `cor` has ended and has nothing more to say, `takeEffect()` will yield:
{
  returnValue: return value of the coroutine,
  done: true
}
If `cor` has ended because of error, `takeEffect()` will yield:
{
  error: error, that was caught,
  done: true
}

Note that `cor` is paused at the current yield and does not continue its execution until
`cor.step(val)` is called.

### coroutine.step(val)
Only available in an inspect mode. Calling `cor.step(val)` will resume `cor` execution until the next
`yield`, using `val` as the yielded value for the previous `yield`.

### coroutine.patch([runnable1, substitute1], [runnable2, substitute2], ...)
For this and **all child coroutines** of the current coroutine, change the implementation of
`runnable_i` to `substitute_i`. For example, if you do `cor.patch([function_a, function_b])`, this
means that wherever in the `cor` when you are trying to run `run(function_a, ...args)` then instead
of this `run(function_b, ...args)` is executed. Note that patched runnable does not need to be a
function. For example,
```
run("foo", ...args)
```
would normally fail (since "foo" is not a function), but if you patch "foo" with some reasonable
implementation in `.patch`, everything will be OK.

Internally, ES6 Map is used to store {runnable: substitute} mapping, which implies how lookup is
performed.

# Context

### context.set(key, val)
Sets `key` to `val` in the current coroutine's context. `key` can be any object; the underlying
implementation uses ES6 Map, which implies the logic of keys equality during `get`/`set`.

### context.get(key, val)
Reads value associated with `key` in the current coroutine's context. If the value is not found, the
`key` is looked up in the parent's context, then in grandparent's context and so on. If the `key` is
not found anywhere, `undefined` is returned.

# Messaging

There are few differences to standard CSP implementations and things you should know:
- channels cannot be closed and cannot be in error state. Channel is simply a pipe which exists
  until someone keeps a reference to it. You don't want to have the channel any more? Just forget
  it and GC will take care of it.

- putting messages to channels is always synchronous operation (you don't have to yield
  `channel.put()`). In other words, yacol won't ever block you on this operation. The reason behind
  this decision is more fundamental: In multithreading environment it might make sense to block the
  producer (thread), if the consumer (thread) does not keep with its pace. However, in JS all
  primitives are callback-based. You cannot ask callback not to happen and you cannot block it. The
  best you can do is put the relevant data to the channel and let it be processed later.

- only one take can be performed on a single channel at one time. If there were multiple takes, this
  basically implies, there is race-condition for who will consume the message first. This may be a
  good thing (only) if multiple workers (doing the same thing) race for who will be available first.
  In single-threaded node environment, we see no use for it.

- the channels plays nice with transducers. When you use transducer for creating some channel, that
  means that transducer will be used on `put` operation to that channel. Yacol uses the most
  popular implementation of the concept:
  [https://github.com/cognitect-labs/transducers-js](https://github.com/cognitect-labs/transducers-js).
  If you want to use transducers, don't forget to `npm install transducers-js`. Yacol does not list
  `transducer-js` as its dependency (for obvious reasons) nor as its peer dependency (until someone
  explains to me, how do peer dependencies work exactly).

### createChannel([transducer])
Creates channel (not bounded to any capacity).

### channel.put(message)
Puts message to channel. The operation is not blocking

### yield channel.take()
Obtains value from channel. If there is no such value, it blocks until the value is available.
# Advanced messaging concepts

### yacol.droppingChannel(capacity, transducer = null)
Creates channel which drops any new message, if the capacity is reached.

### yacol.slidingChannel(capacity, transducer = null)
Creates channel which drops old messages, when the capacity is reached.

### yacol.mult(channel)
Used for publish-subscribe. Returns object referred to as `multObj` below. Note that `mult` consumes
all messages that comes to channel (refered to as 'source channel' below) so no one should take out of
source channel until mult is `.stop` ed.

### multObj.subscribe(channel = null, transducer = null)
Put every messages that comes to `mult` source channel to the given channel. If transducer is
specified, it will be applied. If channel is not specified it will create the new standard (i.e. unbounded)
channel. This channel (whether constructed or obtained) is returned.

The function can be called with any combination of arguments (you can for example omit channel but
provide transducer). Since channels are quite easily distinguishable from other objects, this is not
a mess.

### multObj.unsubscribe(channel)
Unsubscribe channel from `mult`

### multObj.stop()
Stop broadcasting the messages and release the original channel.

### yacol.merge([channel1, channel2, ...], transducer = null, output = null)
pipes all messages from channels into one output channel. Similarly as in `mult`, if the output channel is not
provided, it is constructed (and returned). Similarly as in `mult`, you can specify any combination of
`transducer` and `output` params.

### yacol.mergeNamed({key1: channel1, key2: channel2, ...}, transducer = null, output = null)
Same as merge, but the resulting channel will contain `[key_i, msg]`, where `key_i` identifies the
channel from which the message comes from.

# Misc

### yacol.prettyErrorLog(error)
`console.error`s the error in a nice fashion. It uses information collected during the program
execution to produce stacktrace with much more info than typical stacktraces have. This function is
used by default for unhandled errors on the root coroutine.

### yacol.alts({key1: coroutine1, key2: coroutine2, ...})
Returns coroutine, which returns value from the first finished coroutine. Returns `[key, result]`,
where `result` is the result of the first coroutine which finished and `key` is the corresponding
key under which the coroutine was passed to `alts`. If some coroutine finishes with error error
sooner than some result is produced, the resulting coroutine ends with this error.

### yacol.runDetached(fn, ...args)

:warning: this is pro-stuff you shouldn't use it unles you know what you are doing.

Creates a root coroutine (i.e. parentless coroutine). Unlike with `run`, current coroutine in which
context this was called does *not* become a parent of the newly created coroutine. This means, that the
current coroutine termination won't be blocked with detached one, also the errors from detached
coroutine won't bubble to the current coroutine.

