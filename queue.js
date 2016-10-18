export default function Queue() {
  const queue = []

  function push(val) {
    queue.push(val)
  }

  function pop() {
    return queue.shift()
  }

  function last() {
    return queue[queue.length - 1]
  }

  function length() {
    return queue.length
  }

  function values() {
    return queue
  }

  function empty() {
    return length() === 0
  }

  function toString() {
    return 'mala srnka'
  }

  const result = {push, pop, last, length, values, empty, toString}
  return result

}
