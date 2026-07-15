// $, $$, esc, buildModulePick, toggleModulePick, getCheckedModules, setCheckedModules, safeFetch now in shared.js

let editingId = null
let _modules = []

// ===== 模块列表 =====

async function loadModules () {
  try { _modules = await safeFetch('/api/modules') } catch { _modules = [] }
  $('#availMods').textContent = `可用模块: ${_modules.map(m => m.name).join(', ') || '(无)'}`
  buildModulePick('cfgModulesDrop', _modules)
}

// ===== 配置列表 =====

async function load () {
  let configs = []
  try { configs = await safeFetch('/api/configs') } catch { /* show empty */ }
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
  if (_modules.length) setCheckedModules('cfgModulesDrop', cfg?.modules ?? [])
  $('#editor').classList.remove('hidden')
}

function hide () { $('#editor').classList.add('hidden'); editingId = null }

async function edit (id) {
  try {
    const cfg = await safeFetch(`/api/configs/${id}`)
    show(cfg)
  } catch (err) { alert('加载失败: ' + err.message) }
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
    await safeFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    hide(); load()
  } catch (err) { alert('保存失败: ' + err.message) }
}

// ===== 启动 / 删除 =====

async function launch (configId) {
  try {
    await safeFetch('/api/bots/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ configId }) })
    window.location.href = '/'
  } catch (err) { alert('启动失败: ' + err.message) }
}

async function del (id) {
  if (!confirm('确定删除此配置？')) return
  try {
    await safeFetch(`/api/configs/${id}`, { method: 'DELETE' })
    load()
  } catch (err) { alert('删除失败: ' + err.message) }
}

// ===== 初始化 =====
load()
loadModules()
