export function runnableFromCb(cb) {
  return ({type: 'RunnableFromCb', cb})
}

/*
export function alts = runnableFromCb(...args)

[alts, 1, 2, 3]
*/
