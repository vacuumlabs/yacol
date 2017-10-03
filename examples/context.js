import {context} from 'yacol'

async function contextDemo() {
  context.set('hello', 'world');
  (async () => {
    console.log('if this prints "world", I can read a value from my parent context')
    console.log(context.get('hello'))
  })()
}

contextDemo()
