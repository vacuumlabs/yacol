import fs from 'fs'
export const channelType = '__coroutine__channel__type__'
export const pidString = '__coroutine__current__pid__'
export const corType = '__coroutine__handle__type__'
export const builtinFns = new Set([fs.access, fs.exists, fs.readFile, fs.close, fs.open, fs.read, fs.write, fs.rename, fs.truncate, fs.ftruncate, fs.rmdir, fs.fdatasync, fs.fsync, fs.mkdir, fs.readdir, fs.fstat, fs.lstat, fs.stat, fs.readlink, fs.symlink, fs.link, fs.unlink, fs.fchmod, fs.chmod, fs.fchown, fs.chown, fs.utimes, fs.futimes, fs.writeFile, fs.appendFile, fs.realpath, fs.mkdtemp]) //eslint-disable-line max-len
