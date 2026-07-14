/**
 * 系统配置 — 持久化 API Key 等敏感设置到 JSON 文件
 * 文件路径: data/systemConfig.json (已 gitignore)
 */

const fs = require('fs')
const path = require('path')

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'systemConfig.json')

const DEFAULTS = {
  deepseekApiKey: '',
  deepseekModel: 'deepseek-v4-flash',
  aiSystemPrompt: '',
  aiFewshots: []
}

function _ensureDir () {
  const dir = path.dirname(CONFIG_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function _read () {
  _ensureDir()
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

function _write (data) {
  _ensureDir()
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ ...DEFAULTS, ...data }, null, 2), 'utf-8')
}

function getAll () {
  return _read()
}

function get (key) {
  return _read()[key] ?? DEFAULTS[key]
}

function update (patch) {
  const current = _read()
  const merged = { ...current, ...patch }
  _write(merged)
  return merged
}

module.exports = { getAll, get, update }
