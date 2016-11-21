# Q & A

Q: Most errors in the Promise land happens because someone forgot to `await` or `.then` them. I believe
that forgetting `yield` in yacol is harmless, but what happens if I forget `run`, i.e.
instead of `yield run(fn, arg1, arg2)` I simply write `fn(arg1, arg2)`?

A: Since `fn` is a generator, nothing will happen. No work will be done and you will discover very soon
that there is an error somewhere. It is similar to writing `array.pop;` instead of `array.pop()`.
Not good, but not very harmful, since you'll probably catch the error pretty soon.

Q: Can I create detached / dangling coroutines?

A: Yes, but you shouldn't. Check out `yacol.runDetached` for this. 

Q: If I schedule something for the next event loop (`setTimeout`) or create some separate Promise
chain, will this play nice with yacol's error-handling, coroutine termination, pretty stacktraces,
etc?

A: Sorry, no. I'm not a magician and this certainly is a job for one. In reality, you simply
shouldn't do that. Don't use `setTimeout`, don't use `.then`, don't use `await`. The great thing
about yacol is that you don't need to do this anymore! Even connecting 3rd party APIs can be done
without these.

Q: I hate stupid `yield run(fn, arg1, arg2)` syntax.

A: The main reason why it is there are the awesome stacktraces. They are much cooler than the
basic node stacktraces and IMO worth the cost. If enough people tell me that `yield fn(arg1, arg2)`
is so much nicer that it's worth losing awesome stacktraces, we can change that.
