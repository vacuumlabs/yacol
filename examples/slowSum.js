import Promise from 'bluebird'

async function slowSum(a, b) {
  // Promise object is yieldable
  await Promise.delay(100)
  return a + b
}

async function main() {
  const two = await slowSum(1, 1)
  console.log(two)
  const three = await slowSum(two, 1)
  console.log(three)
}

main()

