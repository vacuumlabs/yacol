const Promise = require('bluebird')

function a() {
  return Promise.resolve(1).then(() => {throw new Error('yuck fou')})
}

function b() {
  return a().then((res) => res + 1)
}

function c() {
  return b().then((res) => res + 1)
}

function d() {
  return c().then((res) => res + 1)
}

d().then((res) => {console.log(res)}).catch((e) => console.error(e))
