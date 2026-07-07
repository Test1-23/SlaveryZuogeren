/**
 * 数据库层 — SQLite 持久化机器人配置
 *
 * 表结构:
 *   bot_configs: id, name, host, port, version, auth, username,
 *                modules (JSON), options (JSON), created_at, updated_at
 */

const path = require('path')
const Database = require('better-sqlite3')

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'bots.db')

// 确保 data 目录存在
const fs = require('fs')
const dataDir = path.dirname(DB_PATH)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = new Database(DB_PATH)

// 启用 WAL 模式提升并发性能
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// 初始化表结构
db.exec(`
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

/**
 * 获取所有配置
 * @returns {Array} 配置列表
 */
function getAllConfigs () {
  const rows = db.prepare('SELECT * FROM bot_configs ORDER BY updated_at DESC').all()
  return rows.map(parseRow)
}

/**
 * 获取单个配置
 * @param {number} id
 * @returns {object|null}
 */
function getConfig (id) {
  const row = db.prepare('SELECT * FROM bot_configs WHERE id = ?').get(id)
  return row ? parseRow(row) : null
}

/**
 * 创建新配置
 * @param {object} cfg
 * @returns {object} 创建后的配置 (含 id)
 */
function createConfig (cfg) {
  const stmt = db.prepare(`
    INSERT INTO bot_configs (name, host, port, version, auth, username, modules, options)
    VALUES (@name, @host, @port, @version, @auth, @username, @modules, @options)
  `)
  const result = stmt.run({
    name: cfg.name || 'New Bot',
    host: cfg.host || 'localhost',
    port: cfg.port || 25565,
    version: cfg.version || '',
    auth: cfg.auth || 'offline',
    username: cfg.username || 'Bot',
    modules: JSON.stringify(cfg.modules || []),
    options: JSON.stringify(cfg.options || {})
  })
  return getConfig(result.lastInsertRowid)
}

/**
 * 更新配置
 * @param {number} id
 * @param {object} cfg
 * @returns {object|null} 更新后的配置
 */
function updateConfig (id, cfg) {
  const existing = getConfig(id)
  if (!existing) return null

  const merged = {
    name: cfg.name ?? existing.name,
    host: cfg.host ?? existing.host,
    port: cfg.port ?? existing.port,
    version: cfg.version ?? existing.version,
    auth: cfg.auth ?? existing.auth,
    username: cfg.username ?? existing.username,
    modules: cfg.modules !== undefined ? JSON.stringify(cfg.modules) : JSON.stringify(existing.modules),
    options: cfg.options !== undefined ? JSON.stringify(cfg.options) : JSON.stringify(existing.options)
  }

  db.prepare(`
    UPDATE bot_configs
    SET name=@name, host=@host, port=@port, version=@version,
        auth=@auth, username=@username, modules=@modules, options=@options,
        updated_at=datetime('now')
    WHERE id=?
  `).run(merged, id)

  return getConfig(id)
}

/**
 * 删除配置
 * @param {number} id
 * @returns {boolean} 是否成功
 */
function deleteConfig (id) {
  const result = db.prepare('DELETE FROM bot_configs WHERE id = ?').run(id)
  return result.changes > 0
}

/**
 * 将数据库行转为普通对象 (JSON 字段反序列化)
 */
function parseRow (row) {
  return {
    ...row,
    modules: JSON.parse(row.modules || '[]'),
    options: JSON.parse(row.options || '{}')
  }
}

module.exports = {
  db,
  getAllConfigs,
  getConfig,
  createConfig,
  updateConfig,
  deleteConfig
}
