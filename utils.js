export function runnableFromCb(cb) {
  return ({type: 'RunnableFromCb', cb})
}

export function randomInt(n) {
  return Math.random() * n
}

export const delay = runnableFromCb((time, cb) => setTimeout(() => cb(), time))

