export class Queue {

  constructor(options = {}) {
    this.waiting = new Set()
    this.options = options
    this.min = 0
    this.max = 0
    this.data = {}
  }

  push = (val) => {
    this.data[`${this.max}`] = val
    this.max += 1
    this.trySatisfy()
  }

  empty = () => (this.max <= this.min)

  pop = (val) => {
    const result = this.data[`${this.min}`]
    delete this.data[`${this.min}`]
    this.min += 1
    return result
  }

  next = (cb) => {
    this.waiting.add(cb)
    this.trySatisfy()
    return {dispose: () => this.waiting.delete(cb)}
  }

  trySatisfy = () => {
    const satisfied = new Set()
    for (let cb of this.waiting) {
      if (this.max > this.min) {
        const res = this.pop()
        cb(res)
        satisfied.add(cb)
      }
    }
    for (let cb of satisfied) {
      this.waiting.delete(cb)
    }
  }

}
