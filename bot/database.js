/**
 * 数据库层 — SQLite 持久化
 *
 * 惰性初始化：getDB() 首次调用时才打开连接。
 * 默认值与 config.js 对齐。
 */

const path = require('path')
const fs = require('fs')
const defaults = require('./config')

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'bots.db')
let _db = null

function getDB () {
  if (_db) return _db
  const Database = require('better-sqlite3')
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  _db.exec(`
    CREATE TABLE IF NOT EXISTS bot_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      host TEXT NOT NULL DEFAULT 'localhost',
      port INTEGER NOT NULL DEFAULT 25565,
      version TEXT DEFAULT '',
      auth TEXT NOT NULL DEFAULT 'offline',
      username TEXT NOT NULL DEFAULT 'Bot',
      modules TEXT NOT NULL DEFAULT '[]',
      options TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  return _db
}

function getAllConfigs () {
  return getDB().prepare('SELECT * FROM bot_configs ORDER BY updated_at DESC').all().map(_parse)
}

function getConfig (id) {
  const row = getDB().prepare('SELECT * FROM bot_configs WHERE id = ?').get(id)
  return row ? _parse(row) : null
}

function createConfig (cfg) {
  const r = getDB().prepare(`
    INSERT INTO bot_configs (name, host, port, version, auth, username, modules, options)
    VALUES (@name, @host, @port, @version, @auth, @username, @modules, @options)
  `).run({
    name: cfg.name || 'New Bot',
    host: cfg.host ?? defaults.host,
    port: cfg.port ?? defaults.port,
    version: cfg.version ?? defaults.version,
    auth: cfg.auth ?? defaults.auth,
    username: cfg.username ?? defaults.username,
    modules: JSON.stringify(cfg.modules ?? []),
    options: JSON.stringify(cfg.options ?? {})
  })
  return getConfig(r.lastInsertRowid)
}

function updateConfig (id, cfg) {
  const db = getDB()
  const update = db.transaction(() => {
    const existing = getConfig(id)
    if (!existing) return null
    db.prepare(`
      UPDATE bot_configs SET name=@name, host=@host, port=@port, version=@version,
        auth=@auth, username=@username, modules=@modules, options=@options,
        updated_at=datetime('now') WHERE id=?
    `).run({
      name: cfg.name ?? existing.name,
      host: cfg.host ?? existing.host,
      port: cfg.port ?? existing.port,
      version: cfg.version ?? existing.version,
      auth: cfg.auth ?? existing.auth,
      username: cfg.username ?? existing.username,
      modules: cfg.modules !== undefined ? JSON.stringify(cfg.modules) : JSON.stringify(existing.modules),
      options: cfg.options !== undefined ? JSON.stringify(cfg.options) : JSON.stringify(existing.options)
    }, id)
    return getConfig(id)
  })
  return update()
}

function deleteConfig (id) {
  return getDB().prepare('DELETE FROM bot_configs WHERE id = ?').run(id).changes > 0
}

function _parse (row) {
  let modules = []
  let options = {}
  try { modules = JSON.parse(row.modules || '[]') } catch (_) { modules = [] }
  try { options = JSON.parse(row.options || '{}') } catch (_) { options = {} }
  return { ...row, modules, options }
}

module.exports = { getDB, getAllConfigs, getConfig, createConfig, updateConfig, deleteConfig }
