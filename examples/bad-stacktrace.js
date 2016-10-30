async function a(n) {
  throw new Error('yuck fou')
}

async function b(n) {
  const res = await a(n + 1)
  return res
}

async function c(n) {
  const res = await b(n + 1)
  return res
}

async function d(n) {
  const res = await c(n + 1)
  return res
}

async function main() {
  try {
    await d(1)
  } catch (e) {
    console.error(e)
  }
}

main()

