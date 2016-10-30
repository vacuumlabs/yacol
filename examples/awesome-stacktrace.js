import {run, prettyErrorLog} from 'yacol'

function* a(n) {
  throw new Error('yuck fou')
}

function* b(n) {
  const res = yield run(a, n + 1)
  return res
}

function* c(n) {
  const res = yield run(b, n + 1)
  return res
}

function* d(n) {
  const res = yield run(c, n + 1)
  return res
}

run(function*() {
  run(d, 1)
}).catch(prettyErrorLog)
