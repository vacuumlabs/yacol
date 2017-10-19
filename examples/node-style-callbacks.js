import {promisify} from 'bluebird'
import fs from 'fs'

async function main() {
  const filename = './__delete__me__'
  await promisify(fs.writeFile)(filename, 'much data')
  const res = await promisify(fs.readFile)(filename)
  await promisify(fs.unlink)(filename)
  console.log(res.toString('utf-8'))
}

main()
