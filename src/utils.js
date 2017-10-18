import {pidString, corType, channelType, terminatedErrorType, assertCorType} from './constants'

export function isIterable(obj) {
  // checks for null and undefined
  if (obj == null) {
    return false
  }
  return typeof obj[Symbol.iterator] === 'function'
}

export function assertIterableOfChannels(obj) {
  if (!isIterable(obj)) {
    throw new Error('the argument should be iterable of channels, it is not iterable')
  }
  for (let ch of obj) {
    if (!isChannel(ch)) {
      console.error('the argument should be iterable of channels, but contains', ch)
      throw new Error('the argument should be iterable of channels')
    }
  }
}

export function onKill(e) {
  return (fn) => {
    if (e.type === terminatedErrorType) {
      fn()
    } else {
      throw e
    }
  }
}

export function killHandler(e) {
  if (e.type !== terminatedErrorType) {
    throw e
  }
}

export function isTerminatedError(cor) {
  return (typeof cor === 'object' && cor != null && cor.type === terminatedErrorType)
}

export function getCurrentCoroutine() {
  return global[pidString]
}

export function isCor(cor) {
  return (typeof cor === 'object' && cor != null && cor.type === corType)
}

export function assertCor(cor) {
  if (!isCor(cor)) {
    const err = new Error('Argument expected to be a corroutine')
    err.type = assertCorType
    throw err
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

function prettyError(e, str = 'ERROR') {
  const res = []
  let cor = e.cor
  res.push(`--- ${str} ----`)
  res.push(`Error: ${e.message}`)
  res.push(prettyStacktrace(e.stack))
  while (true) {
    if (cor == null) {
      return res
    }
    const name = cor.runnable ? (cor.runnable.name || '[Function]') : cor.runnable
    const args = `${cor.args}`
    res.push('')
    res.push(`runnable: ${name}, args: [${args}]`)
    res.push(prettyStacktrace(cor.stacktrace))
    cor = cor.parent || cor.oldParent
  }
}

export function prettyErrorLog(e, str) {
  console.error(prettyError(e, str).join('\n'))
}
