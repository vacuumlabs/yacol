import {run} from 'yacol'

function* crash() {
  throw new Error('crash')
}

run(crash).catch((e) => {console.log('gotcha')}) // catches the error

