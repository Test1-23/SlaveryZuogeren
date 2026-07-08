/**
 * 模块加载器 — 插拔式模块系统
 *
 * 每个模块是 modules/ 下的文件夹，包含 index.js:
 *   module.exports = { name, version, dependencies?, inject(bot, options), unload(bot)? }
 *
 * 用法:
 *   const ml = require('./moduleLoader')
 *   await ml.load(bot, 'echo')
 *   ml.list()           // ['echo']
 *   ml.getLoaded(bot)   // [{ name: 'echo', version: '1.0.0' }]
 *   await ml.unload(bot, 'echo')
 */

const path = require('path')
const fs = require('fs')
const { ModuleRegistry } = require('./moduleRegistry')

const MODULES_DIR = path.join(__dirname, 'modules')

/**
 * 扫描可用模块
 * @returns {string[]}
 */
function listModules () {
  if (!fs.existsSync(MODULES_DIR)) return []
  return fs.readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => d.name)
}

/**
 * 获取或创建 bot 的模块注册表
 */
function _reg (bot) {
  if (!bot._moduleRegistry) {
    bot._moduleRegistry = new ModuleRegistry(MODULES_DIR)
  }
  return bot._moduleRegistry
}

/**
 * 获取已加载模块列表
 * @param {object} bot
 * @returns {{name: string, version: string}[]}
 */
function getLoadedModules (bot) {
  return _reg(bot).loaded
}

/**
 * 加载模块
 * @param {object} bot
 * @param {string} moduleName
 * @param {object} [opts]
 */
async function loadModule (bot, moduleName, opts = {}) {
  const reg = _reg(bot)

  if (reg.has(moduleName)) {
    console.warn(`[ModuleLoader] 模块 "${moduleName}" 已加载`)
    return reg.get(moduleName)
  }

  const modPath = path.join(MODULES_DIR, moduleName, 'index.js')
  if (!fs.existsSync(modPath)) throw new Error(`模块 "${moduleName}" 不存在: ${modPath}`)

  const mod = require(modPath)
  if (!mod.name) mod.name = moduleName
  if (typeof mod.inject !== 'function') throw new Error(`模块 "${moduleName}" 缺少 inject(bot, options)`)

  mod.version = mod.version || '0.0.0'
  mod.dependencies = mod.dependencies || []

  // 递归加载依赖
  for (const dep of mod.dependencies) {
    if (!reg.has(dep)) {
      console.warn(`[ModuleLoader] 自动加载依赖: ${dep}`)
      await loadModule(bot, dep, opts)
    }
  }

  await mod.inject(bot, opts)

  const meta = { name: mod.name, version: mod.version, dependencies: mod.dependencies, module: mod, options: opts }
  reg.register(meta)
  console.log(`[ModuleLoader] ✓ ${mod.name} v${mod.version}`)
  return meta
}

/**
 * 卸载模块
 * @param {object} bot
 * @param {string} moduleName
 */
async function unloadModule (bot, moduleName) {
  const reg = _reg(bot)
  const meta = reg.get(moduleName)
  if (!meta) { console.warn(`[ModuleLoader] "${moduleName}" 未加载`); return }

  // 检查反向依赖
  for (const [n, m] of reg._loaded) {
    if (m.dependencies.includes(moduleName)) {
      throw new Error(`无法卸载 "${moduleName}": "${n}" 依赖它`)
    }
  }

  if (typeof meta.module.unload === 'function') {
    try { await meta.module.unload(bot) } catch (e) { console.error(`[ModuleLoader] unload 失败: ${e.message}`) }
  }

  reg.unregister(moduleName)
  delete require.cache[require.resolve(path.join(MODULES_DIR, moduleName, 'index.js'))]
  console.log(`[ModuleLoader] ✗ ${moduleName}`)
}

/**
 * 从列表加载多个模块 (不因单个失败而中断)
 * @param {object} bot
 * @param {string[]} names
 */
async function loadModules (bot, names) {
  for (const name of names) {
    try { await loadModule(bot, name) } catch (e) { console.error(`[ModuleLoader] ${name}: ${e.message}`) }
  }
}

module.exports = { listModules, getLoadedModules, loadModule, unloadModule, loadModules }
