export class Queue {

  constructor(options = {}) {
    this.waiting = null
    this.options = options
    this.min = 0
    this.max = 0
    this.data = {}
  }

  push = (val) => {
    this.data[`${this.max}`] = val
    this.max += 1
    if (this.options.sliding != null) {
      const sliding = this.options.sliding
      if (this.max - this.min > sliding) {
        this.min = this.max - sliding
      }
    }
    if (this.options.dropping != null) {
      const dropping = this.options.dropping
      if (this.max - this.min > dropping) {
        this.max = this.min + dropping
      }
    }
    this.trySatisfy()
  }

  empty = () => (this.max <= this.min)

  pop = (val) => {
    if (this.empty()) {
      throw new Error('cannot pop empty queue')
    }
    const result = this.data[`${this.min}`]
    delete this.data[`${this.min}`]
    this.min += 1
    return result
  }

  first = () => {
    return this.data[`${this.min}`]
  }

  next = (cb) => {
    if (this.waiting != null) {
      throw new Error('cannot take from one channel more than once')
    }
    this.waiting = cb
    this.trySatisfy()
    return {dispose: () => {this.waiting = null}}
  }

  trySatisfy = () => {
    if (this.max > this.min && this.waiting != null) {
      if (typeof this.waiting !== 'function') {
        console.error('wtf', this.waiting)
      }
      this.waiting()
      this.waiting = null
    }
  }

}
