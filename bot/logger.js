/**
 * 日志系统 — 同时输出到控制台和文件
 *
 * 日志文件: logs/YYYY-MM-DD-HHmmss-<tag>.log
 * 级别: DEBUG < INFO < WARN < ERROR
 *
 * 用法:
 *   const logger = require('./logger')('ModuleName')
 *   logger.info('message')
 *   logger.error('message', err)
 *   logger.debug('verbose details')
 */

const fs = require('fs')
const path = require('path')

const LOG_DIR = path.join(__dirname, '..', 'logs')
const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 }
const LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR']

let _minLevel = LEVELS.INFO
if (process.env.LOG_LEVEL) {
  _minLevel = LEVELS[process.env.LOG_LEVEL.toUpperCase()] ?? LEVELS.INFO
}

// 确保目录存在
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })

// 当前小时的日志文件 (按小时滚动)
let _currentFile = null
let _currentHour = null

function _getFile () {
  const now = new Date()
  const hour = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}`
  if (hour !== _currentHour) {
    _currentHour = hour
    _currentFile = path.join(LOG_DIR, `${hour}.log`)
  }
  return _currentFile
}

function _write (level, tag, args) {
  const ts = new Date().toISOString()
  const line = args.map(a => {
    if (a instanceof Error) return a.stack || a.message
    if (typeof a === 'object') {
      try { return JSON.stringify(a, null, 0) } catch { return String(a) }
    }
    return String(a)
  }).join(' ')

  const text = `[${ts}] [${LEVEL_NAMES[level]}] [${tag}] ${line}`

  // 控制台
  if (level >= LEVELS.WARN) console.error(text)
  else console.log(text)

  // 文件
  try { fs.appendFileSync(_getFile(), text + '\n', 'utf-8') } catch (_) { /* 磁盘满等极端情况静默 */ }
}

function createLogger (tag) {
  return {
    debug: (...args) => { if (_minLevel <= LEVELS.DEBUG) _write(LEVELS.DEBUG, tag, args) },
    info: (...args) => { if (_minLevel <= LEVELS.INFO) _write(LEVELS.INFO, tag, args) },
    warn: (...args) => { if (_minLevel <= LEVELS.WARN) _write(LEVELS.WARN, tag, args) },
    error: (...args) => { if (_minLevel <= LEVELS.ERROR) _write(LEVELS.ERROR, tag, args) }
  }
}

module.exports = { createLogger, LEVELS }
