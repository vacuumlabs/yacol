export class SimpleQueue {

  constructor() {
    this.queue = []
  }

  push = (val) => {
    this.queue.push(val)
  }

  pop = () => {
    return this.queue.shift()
  }

  last = () => {
    return this.queue[this.queue.length - 1]
  }

  length = () => {
    return this.queue.length
  }

  values = () => {
    return this.queue
  }

  empty = () => {
    return this.length() === 0
  }
}

export class WaitingQueue extends SimpleQueue {

  constructor() {
    super()
    this.waiting = new Map()
  }

  push = (val) => {
    // TODO debug this
    // super.push(val)
    this.queue.push(val)
    this.trySatisfy()
  }

  next = (lastValue, cb) => {
    this.waiting.set(cb, lastValue)
    this.trySatisfy()
    return {dispose: () => this.waiting.delete(cb)}
  }

  trySatisfy = () => {
    const satisfied = new Set()
    for (let [cb, lastValue] of this.waiting) {
      if (lastValue == null) {
        lastValue = 0
      }
      if (this.queue.length - 1 >= lastValue) {
        cb(this.queue[lastValue], lastValue + 1)
        satisfied.add(cb)
      }
    }
    for (let cb of satisfied) {
      this.waiting.delete(cb)
    }
  }

}
