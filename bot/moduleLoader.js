/**
 * 模块加载器 — 插拔式模块系统
 *
 * 每个模块是 modules/ 下的一个文件夹，包含 index.js，导出:
 *   module.exports = {
 *     name: '模块名',           // 唯一标识
 *     version: '1.0.0',       // 版本号
 *     dependencies: [],        // 依赖的其他模块名 (可选)
 *     inject(bot, options) {}, // 注入函数，模块在此初始化
 *     unload(bot) {}           // 卸载函数 (可选)，模块在此清理
 *   }
 *
 * 用法:
 *   const { initModules, loadModule, unloadModule, listModules, getLoadedModules } = require('./moduleLoader')
 *
 *   // 加载配置中指定的所有模块
 *   await initModules(bot, config)
 *
 *   // 运行时动态加载模块
 *   await loadModule(bot, 'attack')
 *
 *   // 运行时卸载模块
 *   await unloadModule(bot, 'attack')
 */

const path = require('path')
const fs = require('fs')

// 模块注册表 — 存储在 bot 对象上
const MODULES_KEY = Symbol('modules')

/**
 * 获取或初始化 bot 的模块注册表
 */
function registry (bot) {
  if (!bot[MODULES_KEY]) {
    bot[MODULES_KEY] = {
      loaded: {}, // { name: { name, version, dependencies, module, inject, unload } }
      order: [] // 加载顺序
    }
  }
  return bot[MODULES_KEY]
}

/**
 * 扫描 modules/ 目录，返回所有可用模块的名称列表
 * @returns {string[]}
 */
function listModules () {
  const modulesDir = path.join(__dirname, 'modules')
  if (!fs.existsSync(modulesDir)) return []
  return fs.readdirSync(modulesDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== '.gitkeep')
    .map(d => d.name)
}

/**
 * 获取 bot 已加载的模块列表
 * @param {object} bot
 * @returns {{name: string, version: string}[]}
 */
function getLoadedModules (bot) {
  return registry(bot).order.map(name => ({
    name,
    version: registry(bot).loaded[name].version
  }))
}

/**
 * 加载单个模块
 * @param {object} bot - mineflayer bot 实例
 * @param {string} moduleName - 模块名 (modules/ 下的文件夹名)
 * @param {object} [moduleOptions] - 传递给模块 inject 的配置
 * @returns {Promise<object>} 加载的模块信息
 */
async function loadModule (bot, moduleName, moduleOptions = {}) {
  const reg = registry(bot)

  // 检查是否已加载
  if (reg.loaded[moduleName]) {
    bot._warn(`[ModuleLoader] 模块 "${moduleName}" 已加载，跳过`)
    return reg.loaded[moduleName]
  }

  // 动态加载模块文件
  const modulePath = path.join(__dirname, 'modules', moduleName, 'index.js')
  if (!fs.existsSync(modulePath)) {
    throw new Error(`[ModuleLoader] 模块 "${moduleName}" 不存在: ${modulePath}`)
  }

  const mod = require(modulePath)

  // 验证模块接口
  if (!mod.name && !moduleName) {
    throw new Error(`[ModuleLoader] 模块 "${moduleName}" 缺少 name 字段`)
  }
  if (typeof mod.inject !== 'function') {
    throw new Error(`[ModuleLoader] 模块 "${moduleName}" 缺少 inject(bot, options) 函数`)
  }

  mod.name = mod.name || moduleName
  mod.version = mod.version || '0.0.0'
  mod.dependencies = mod.dependencies || []

  // 检查依赖
  for (const dep of mod.dependencies) {
    if (!reg.loaded[dep]) {
      console.warn(`[ModuleLoader] 模块 "${mod.name}" 依赖 "${dep}"，但 "${dep}" 尚未加载，尝试自动加载...`)
      try {
        await loadModule(bot, dep, moduleOptions)
      } catch (err) {
        throw new Error(`[ModuleLoader] 无法加载依赖 "${dep}": ${err.message}`)
      }
    }
  }

  // 执行注入
  try {
    await mod.inject(bot, moduleOptions)
  } catch (err) {
    throw new Error(`[ModuleLoader] 模块 "${mod.name}" inject() 执行失败: ${err.message}`)
  }

  // 注册
  reg.loaded[mod.name] = {
    name: mod.name,
    version: mod.version,
    dependencies: mod.dependencies,
    module: mod,
    options: moduleOptions
  }
  reg.order.push(mod.name)

  console.log(`[ModuleLoader] ✓ 模块 "${mod.name}" v${mod.version} 加载成功`)
  return reg.loaded[mod.name]
}

/**
 * 卸载单个模块
 * @param {object} bot - mineflayer bot 实例
 * @param {string} moduleName - 要卸载的模块名
 */
async function unloadModule (bot, moduleName) {
  const reg = registry(bot)

  if (!reg.loaded[moduleName]) {
    console.warn(`[ModuleLoader] 模块 "${moduleName}" 未加载`)
    return
  }

  // 检查是否有其他模块依赖此模块
  for (const [name, info] of Object.entries(reg.loaded)) {
    if (info.dependencies.includes(moduleName)) {
      throw new Error(`[ModuleLoader] 无法卸载 "${moduleName}": 模块 "${name}" 依赖它`)
    }
  }

  // 执行卸载
  const mod = reg.loaded[moduleName]
  if (typeof mod.module.unload === 'function') {
    try {
      await mod.module.unload(bot)
    } catch (err) {
      console.error(`[ModuleLoader] 模块 "${moduleName}" unload() 失败: ${err.message}`)
    }
  }

  // 从注册表移除
  delete reg.loaded[moduleName]
  reg.order = reg.order.filter(n => n !== moduleName)

  // 清除 require 缓存 (允许重新加载)
  const modulePath = path.join(__dirname, 'modules', moduleName, 'index.js')
  delete require.cache[require.resolve(modulePath)]

  console.log(`[ModuleLoader] ✗ 模块 "${moduleName}" 已卸载`)
}

/**
 * 从配置初始化所有模块
 * @param {object} bot - mineflayer bot 实例
 * @param {object} config - 配置文件 (bot/config.js)
 */
async function initModules (bot, config) {
  const modules = config.modules || []

  console.log(`[ModuleLoader] 可用模块: ${listModules().join(', ') || '(无)'}`)
  console.log(`[ModuleLoader] 待加载模块: ${modules.join(', ') || '(无)'}`)

  for (const moduleName of modules) {
    try {
      await loadModule(bot, moduleName, config)
    } catch (err) {
      console.error(`[ModuleLoader] 加载模块 "${moduleName}" 失败: ${err.message}`)
      // 不抛出，允许 bot 在其他模块正常的情况下继续运行
    }
  }

  console.log(`[ModuleLoader] 已加载模块: ${getLoadedModules(bot).map(m => m.name).join(', ') || '(无)'}`)
}

module.exports = {
  initModules,
  loadModule,
  unloadModule,
  listModules,
  getLoadedModules
}
