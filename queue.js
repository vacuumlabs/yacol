export class WaitingQueue {

  constructor(options = {}) {
    this.waiting = new Map()
    this.options = options
    this.min = 0
    this.max = 0
    this.queue = {}
  }

  push = (val) => {
    this.queue[`${this.max}`] = val
    this.max += 1
    this.trySatisfy()
  }

  empty = () => (this.max <= this.min)

  pop = (val) => {
    const result = this.queue[`${this.min}`]
    delete this.queue[`${this.min}`]
    this.min += 1
    return result
  }

  next = (lastValue, cb) => {
    this.waiting.set(cb, lastValue)
    this.trySatisfy()
    return {dispose: () => this.waiting.delete(cb)}
  }

  last = () => {
    return this.queue[`${this.max - 1}`]
  }

  trySatisfy = () => {
    const satisfied = new Set()
    for (let [cb, lastValue] of this.waiting) {
      if (lastValue == null) {
        lastValue = 0
      }
      if (this.max > lastValue && this.max > this.min) {
        let res
        if (this.options.discardRead) {
          res = this.pop()
          lastValue = this.min
        } else {
          res = this.queue[`${lastValue}`]
          lastValue += 1
        }
        cb(res, lastValue)
        satisfied.add(cb)
      }
    }
    for (let cb of satisfied) {
      this.waiting.delete(cb)
    }
  }

}
