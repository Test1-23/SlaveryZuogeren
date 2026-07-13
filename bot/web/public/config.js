const $ = (s) => document.querySelector(s)
const $$ = (s) => document.querySelectorAll(s)

let editingId = null
let _modules = []

// ===== 模块选择器 =====

async function loadModules () {
  _modules = await fetch('/api/modules').then(r => r.json())
  $('#availMods').textContent = `可用模块: ${_modules.join(', ') || '(无)'}`
  buildModulePick('cfgModulesDrop', _modules)
}

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
  if (drop.classList.contains('show')) {
    setTimeout(() => document.addEventListener('click', handler), 0)
  }
}

function getCheckedModules (dropId) {
  return Array.from($$('#' + dropId + ' input[type=checkbox]:checked')).map(cb => cb.value)
}

function setCheckedModules (dropId, names) {
  $$('#' + dropId + ' input[type=checkbox]').forEach(cb => { cb.checked = names.includes(cb.value) })
}

// ===== 加载 =====

async function load () {
  const configs = await fetch('/api/configs').then(r => r.json())
  render(configs)
}

function render (configs) {
  const tbody = $('#configTable tbody')
  if (!configs.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty">暂无配置，点击 "新建配置" 创建</td></tr>'; return }
  tbody.innerHTML = configs.map(c => `
    <tr>
      <td>${c.id}</td><td><strong>${esc(c.name)}</strong></td><td>${esc(c.username)}</td>
      <td>${esc(c.host)}:${c.port}</td><td>${c.version || '自动'}</td>
      <td>${c.auth}</td>
      <td>${(c.modules||[]).join(', ') || '-'}</td>
      <td>
        <button class="btn-start" onclick="launch(${c.id})">启动</button>
        <button class="btn-edit" onclick="edit(${c.id})">编辑</button>
        <button class="btn-danger" onclick="del(${c.id})">删除</button>
      </td>
    </tr>`).join('')
}

// ===== 编辑器 =====

$('#newCfgBtn').onclick = () => show()
$('#cancelBtn').onclick = hide
$('#saveBtn').onclick = save

function show (cfg) {
  editingId = cfg?.id ?? null
  $('#editorTitle').textContent = cfg ? `编辑: ${cfg.name}` : '新建配置'
  $('#cfgName').value = cfg?.name ?? ''
  $('#cfgHost').value = cfg?.host ?? 'localhost'
  $('#cfgPort').value = cfg?.port ?? 25565
  $('#cfgVersion').value = cfg?.version ?? ''
  $('#cfgAuth').value = cfg?.auth ?? 'offline'
  $('#cfgUsername').value = cfg?.username ?? 'Bot'
  // 等待模块列表加载后勾选
  if (_modules.length) {
    setCheckedModules('cfgModulesDrop', cfg?.modules ?? [])
  }
  $('#editor').classList.remove('hidden')
}

function hide () { $('#editor').classList.add('hidden'); editingId = null }

async function edit (id) {
  const cfg = await fetch(`/api/configs/${id}`).then(r => r.json())
  if (cfg.error) return alert('加载失败: ' + cfg.error)
  show(cfg)
}

async function save () {
  const data = {
    name: $('#cfgName').value.trim(),
    host: $('#cfgHost').value.trim() || 'localhost',
    port: parseInt($('#cfgPort').value) || 25565,
    version: $('#cfgVersion').value.trim(),
    auth: $('#cfgAuth').value,
    username: $('#cfgUsername').value.trim() || 'Bot',
    modules: getCheckedModules('cfgModulesDrop')
  }
  if (!data.name) return alert('备注名不能为空')

  const url = editingId ? `/api/configs/${editingId}` : '/api/configs'
  const method = editingId ? 'PUT' : 'POST'
  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (!res.ok) throw new Error((await res.json()).error)
    hide(); load()
  } catch (err) { alert('保存失败: ' + err.message) }
}

// ===== 启动 / 删除 =====

async function launch (configId) {
  try {
    const res = await fetch('/api/bots/start', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ configId })
    })
    if (!res.ok) throw new Error((await res.json()).error)
    window.location.href = '/'
  } catch (err) { alert('启动失败: ' + err.message) }
}

async function del (id) {
  if (!confirm('确定删除此配置？')) return
  const res = await fetch(`/api/configs/${id}`, { method: 'DELETE' })
  if (res.ok) load(); else alert('删除失败')
}

function esc (s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]) }

// ===== 初始化 =====
load()
loadModules()
