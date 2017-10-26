async function aaa(n) {
  throw new Error('whooops')
}

async function bbb(n) {
  const res = await aaa(n + 1)
  return res
}

const ccc = async (n) => {
  const res = await bbb(n + 1)
  return res
}

(async () => {
  await ccc(1)
})()
