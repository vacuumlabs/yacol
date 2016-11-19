# Q & A

Q: Most errors in Promise land happens because someone forgot to `await` or `.then` them. I believe,
that forgetting `yield` in yacol is harmless, but what happens if I forgot `run`, i.e.
instead of `yield run(fn, arg1, arg2)` I simply write `fn(arg1, arg2)` ?

A: With `fn` being a generator, nothing will happen. No work will be done and very soon you'll
discover, there is an error somewhere. It is similar as if instead of `array.pop()` you write
`array.pop;`. Not good, but much much more harmless, since you'll probably catch the error pretty soon.

Q: Can I create detached / dangling coroutines

A: Yes, but you shouldn't. Check out `yacol.runDetached` for this. 

Q: If I schedule something for a next event loop (`setTimeout`) or create some separate Promise
chain, will this play nicely with yacol's error-handling, coroutine termination, pretty stacktraces,
etc? 

A: Sorry, no. I'm not a magician and this certainly is a job for one. In reality, you simply
shouldn't do that. Don't use `setTimeout`, don't use `.then`, don't use `await`. The great thing
about yacol is that you don't need to do this anymore! Even connecting 3rd party APIs can be done
without these.

Q: I hate stupid `yield run(fn, arg1, arg2)` syntax.

A: The main reason why it is there are the awesome stacktraces. They are much cooler than the
basic node stacktraces and IMO worth the cost. If enough people tell me that `yield fn(arg1, arg2)`
is so much nicer it's worth losing awesome stacktraces, we can change that.
