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
    this.iteratorData = new Map()
    this.waiting = new Map()
  }

  push = (val) => {
    // TODO debug this
    // super.push(val)
    this.queue.push(val)
    this.notifyIterators()
  }

  notifyIterators() {
    for (let [iterator] of this.waiting) {
      this.trySatisfy(iterator)
    }
  }

  trySatisfy(id) {
    const index = this.iteratorData.get(id)
    if (this.queue.length - 1 >= index) {
      const cbQueue = this.waiting.get(id)
      if (!cbQueue.empty()) {
        const firstCb = cbQueue.pop()
        this.iteratorData.set(id, index + 1)
        firstCb(this.queue[index])
      }
    }
  }

  iterator = () => {

    let id = {}

    this.waiting.set(id, new SimpleQueue())
    this.iteratorData.set(id, 0)

    const next = (cb) => {
      this.waiting.get(id).push(cb)
      this.trySatisfy(id)
    }

    return {next}

  }

}
