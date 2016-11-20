import Promise from 'bluebird'
import {run, runc} from 'yacol'
import fs from 'fs'

run(function*() {
  const filename = './__delete__me__'
  yield runc(fs.writeFile, filename, 'much data')
  const res = yield runc(fs.readFile, filename)
  yield runc(fs.unlink, filename)
  console.log(res.toString('utf-8'))
})
