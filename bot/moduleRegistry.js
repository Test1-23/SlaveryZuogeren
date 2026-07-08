/**
 * ModuleRegistry — 模块注册表类
 *
 * 替换原来挂载在 bot 对象上通过 Symbol 隐藏的注册表。
 * 实例化后挂在 bot.moduleLoader 上，可被检查、序列化、独立测试。
 */

class ModuleRegistry {
  /** @param {string} modulesDir — 模块文件夹的绝对路径 */
  constructor (modulesDir) {
    this._dir = modulesDir
    this._loaded = new Map() // name → { name, version, dependencies, module, options }
    this._order = []
  }

  get loaded () { return this._order.map(n => ({ name: n, version: this._loaded.get(n).version })) }
  get count () { return this._order.length }

  has (name) { return this._loaded.has(name) }
  get (name) { return this._loaded.get(name) || null }
  list () { return this._order.slice() }

  register (meta) {
    if (this._loaded.has(meta.name)) return false
    this._loaded.set(meta.name, meta)
    this._order.push(meta.name)
    return true
  }

  unregister (name) {
    this._loaded.delete(name)
    this._order = this._order.filter(n => n !== name)
  }
}

module.exports = { ModuleRegistry }
