import {pidString, corType, channelType} from './constants'

export function getCurrentCoroutine() {
  return global[pidString]
}

export function isCor(handle) {
  return (typeof handle === 'object' && handle != null && handle.type === corType)
}

export function assertCor(handle) {
  if (!isCor(handle)) {
    throw new Error('argument expected to be a handle')
  }
}

export function isChannel(channel) {
  return (typeof channel === 'object' && channel != null && channel.type === channelType)
}

export function assertChannel(channel) {
  if (!isChannel(channel)) {
    throw new Error('argument expected to be a channel')
  }
}

const regexBlacklist = [
  '^module.js$',
  '^timers.js$',
  'babel-register/lib/node.js$',
  'babel-cli/lib/_babel-node.js$',
  'yacol/src/cor.js$',
  'yacol/dist/cor.js$',
]

export function prettyStacktrace(stacktrace) {
  //return stacktrace
  const res = []
  let file
  for (let line of stacktrace.split(/\n/)) {
    let parens = line.match(/\((.*)\)/)
    if (parens != null) {
      file = parens[1].match(/(.*):(.*):(.*)/)
      if (file == null) {
        continue
      } else {
        file = file[1]
      }
    } else {
      const atFile = line.match(/at (.*):(.*):(.*)/)
      if (atFile != null) {
        file = atFile[1]
      } else {
        continue
      }
    }

    if (file == null) {
      continue
    }

    let include = true
    for (let pattern of regexBlacklist) {
      if (file.match(new RegExp(pattern))) {
        include = false
        break
      }
    }
    if (include) {
      res.push(line)
    }
  }
  return res.join('\n')
}

function prettyError(e) {
  const res = []
  let handle = e.handle
  res.push('--- ERROR ----')
  res.push(`Error: ${e.message}`)
  res.push(prettyStacktrace(e.stack))
  while (true) {
    if (handle == null) {
      return res
    }
    const name = handle.fn.name || '[Function]'
    const args = `${handle.args}`
    res.push(`${name}, [${args}]`)
    res.push(prettyStacktrace(handle.stacktrace))
    handle = handle.parent
  }
}

export function prettyErrorLog(e) {
  console.error(prettyError(e).join('\n'))
}
