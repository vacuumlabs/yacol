# Q & A

Q: Most errors in Promise land happens because someone forgot to `await` or `.then` them. I believe,
that forgetting `yield` in yacol is harmless, but what happens if I forgot `run`, i.e.
instead of `yield run(fn, arg1, arg2)` I simply write `fn(arg1, arg2)` ?

A: With `fn` being a generator, nothing will happen. No work will be done and very soon you'll
discover, there is an error somewhere. It is similar as if instead of `array.pop()` you write
`array.pop;`. Not good, but you'll probably catch the error pretty soon.


Q: Can I create detached / dangling coroutines

A: Yes, but you shouldn't. For example you can do whatever you want in `setTimeout`'s callback, this
is completely separated dimension.


Q: So if I schedule something for a next event loop (`setTimeout`) or create some separate Promise
chain, yacol won't help me with its magic?

A: Sorry, no. Don't do that. Don't use `setTimeout`, don't use `.then`, don't use `await`. Unless connecting some 3rd party library to yacol environment, you probably never have to.


Q: I hate stupid `yield run(fn, arg1, arg2)` syntax.

A: The main reason why it is there are the awesome stacktraces. They are much cooler than the
basic node stacktraces and IMO worth the cost.

