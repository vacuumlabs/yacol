import {WaitingQueue} from './queue'

const queue = new WaitingQueue()

queue.push(1)
queue.push(2)
const iter = queue.iterator()

for (let i = 0; i < 10; i++) {
  iter.next((val) => {
    console.log(val)
  })
}


let msg = 0
setInterval(() => {queue.push(`msg_${msg}`); msg++}, 100)

