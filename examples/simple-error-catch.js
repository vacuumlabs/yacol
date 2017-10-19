async function crash() {
  throw new Error('crash')
}


async function main() {
  try {
    await crash()
  } catch (e) {
    console.log('gotcha')
  }
}

main()
