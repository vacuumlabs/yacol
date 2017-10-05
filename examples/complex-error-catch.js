async function asyncThrow() {
  throw new Error('SAD')
}

async function fn() {
  // it doesn't matter, whether fn awaits fn1 and fn2;
  // either way fn ends up being rejected
  asyncThrow()
}

async function main() {
  try {
    await fn() // only here the await must not be forgotten
  } catch (e) {
    console.log('Unlike with standard promises, error will be caught')
  }
}

main()
