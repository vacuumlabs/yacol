import {run, context} from 'yacol'

run(function*() {
  context.set('hello', 'world')
  run(function*() {
    console.log('if this prints "world", I can read a value from my parent context')
    console.log(context.get('hello'))
  })
})
