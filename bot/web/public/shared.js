/**
 * 共享工具 — 仪表盘和配置页面共用
 * 在 app.js / config.js 之前加载
 */

const $ = (s) => document.querySelector(s)
const $$ = (s) => document.querySelectorAll(s)

// ===== 模块选择器 =====

function buildModulePick (dropId, modules) {
  if (!modules.length) { $('#' + dropId).innerHTML = '<span class="mp-empty">暂无可用模块</span>'; return }
  $('#' + dropId).innerHTML = modules.map(m => {
    const name = typeof m === 'string' ? m : m.name
    const deps = m.dependencies || []
    const isSub = deps.length > 0
    const parent = isSub ? deps[0] : null
    return `<label class="mp-item${isSub ? ' mp-sub' : ''}" data-depends="${parent || ''}">
      <input type="checkbox" value="${esc(name)}" ${isSub ? `data-depends="${esc(parent)}"` : ''}> ${esc(name)}
      ${isSub ? `<span class="mp-dep-tag">依赖 ${esc(parent)}</span>` : ''}
    </label>`
  }).join('')

  $$('#' + dropId + ' input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      $$('#' + dropId + ' input[data-depends="' + cb.value + '"]').forEach(sub => {
        sub.disabled = !cb.checked
        if (!cb.checked) sub.checked = false
      })
    })
    if (cb.dataset.depends) {
      const p = $('#' + dropId + ' input[value="' + cb.dataset.depends + '"]')
      if (p) cb.disabled = !p.checked
    }
  })
}

function toggleModulePick (pickId) {
  const drop = $('#' + pickId + 'Drop')
  drop.classList.toggle('show')
  const handler = (e) => {
    if (!e.target.closest('#' + pickId)) { drop.classList.remove('show'); document.removeEventListener('click', handler) }
  }
  if (drop.classList.contains('show')) setTimeout(() => document.addEventListener('click', handler), 0)
}

function getCheckedModules (dropId) {
  return Array.from($$('#' + dropId + ' input[type=checkbox]:checked')).map(cb => cb.value)
}

function setCheckedModules (dropId, names) {
  $$('#' + dropId + ' input[type=checkbox]').forEach(cb => { cb.checked = names.includes(cb.value) })
}

// ===== HTML 转义 =====

function esc (s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
}

// ===== 安全的 fetch 包装 =====

async function safeFetch (url, opts = {}) {
  try {
    const res = await fetch(url, opts)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    return data
  } catch (err) {
    console.warn(`[fetch] ${opts.method || 'GET'} ${url}:`, err.message)
    throw err
  }
}
