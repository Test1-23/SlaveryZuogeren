/**
 * 配置管理页面逻辑
 */

const $ = (s) => document.querySelector(s)

// ===== 加载 =====

async function loadConfigs () {
  const [configs, modules] = await Promise.all([
    fetch('/api/configs').then(r => r.json()),
    fetch('/api/modules').then(r => r.json())
  ])
  $('#availableModules').textContent = `可用模块: ${modules.join(', ') || '(无)'}`
  renderConfigs(configs)
}

async function loadModules () {
  const modules = await fetch('/api/modules').then(r => r.json())
  $('#availableModules').textContent = `可用模块: ${modules.join(', ') || '(无)'}`
}

// ===== 渲染配置列表 =====

function renderConfigs (configs) {
  const tbody = $('#configTable tbody')
  if (configs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty">暂无配置，点击上方按钮新建</td></tr>'
    return
  }
  tbody.innerHTML = configs.map(c => `
    <tr>
      <td>${c.id}</td>
      <td><strong>${esc(c.name)}</strong></td>
      <td>${esc(c.host)}:${c.port}</td>
      <td>${c.version || '自动'}</td>
      <td>${c.auth}</td>
      <td>${esc(c.username)}</td>
      <td>${(c.modules || []).join(', ') || '-'}</td>
      <td>
        <button class="btn-start" onclick="startBot(${c.id})">启动</button>
        <button class="btn-start" style="background:var(--orange)" onclick="editConfig(${c.id})">编辑</button>
        <button class="btn-danger" onclick="deleteConfig(${c.id})">删除</button>
      </td>
    </tr>
  `).join('')
}

function esc (s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]) }

// ===== 编辑器 =====

let editingId = null

$('#newConfigBtn').onclick = () => showEditor()
$('#cfgCancelBtn').onclick = () => hideEditor()
$('#cfgSaveBtn').onclick = saveConfig

function showEditor (cfg = null) {
  editingId = cfg?.id ?? null
  $('#editorTitle').textContent = cfg ? `编辑: ${cfg.name}` : '新建配置'
  $('#cfgName').value = cfg?.name ?? ''
  $('#cfgHost').value = cfg?.host ?? 'localhost'
  $('#cfgPort').value = cfg?.port ?? 25565
  $('#cfgVersion').value = cfg?.version ?? ''
  $('#cfgAuth').value = cfg?.auth ?? 'offline'
  $('#cfgUsername').value = cfg?.username ?? 'Bot'
  $('#cfgModules').value = (cfg?.modules ?? []).join(', ')
  $('#editor').classList.remove('hidden')
}

function hideEditor () {
  $('#editor').classList.add('hidden')
  editingId = null
}

async function editConfig (id) {
  const configs = await fetch('/api/configs').then(r => r.json())
  const cfg = configs.find(c => c.id === id)
  if (cfg) showEditor(cfg)
}

async function saveConfig () {
  const data = {
    name: $('#cfgName').value || 'New Bot',
    host: $('#cfgHost').value || 'localhost',
    port: parseInt($('#cfgPort').value) || 25565,
    version: $('#cfgVersion').value || '',
    auth: $('#cfgAuth').value,
    username: $('#cfgUsername').value || 'Bot',
    modules: $('#cfgModules').value.split(',').map(s => s.trim()).filter(Boolean)
  }

  try {
    const url = editingId ? `/api/configs/${editingId}` : '/api/configs'
    const method = editingId ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (!res.ok) throw new Error((await res.json()).error)
    hideEditor()
    loadConfigs()
  } catch (err) {
    alert('保存失败: ' + err.message)
  }
}

// ===== 启动 / 删除 =====

async function startBot (configId) {
  try {
    const res = await fetch('/api/bots/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configId })
    })
    if (!res.ok) throw new Error((await res.json()).error)
    window.location.href = '/'
  } catch (err) {
    alert('启动失败: ' + err.message)
  }
}

async function deleteConfig (id) {
  if (!confirm('确定删除此配置？')) return
  const res = await fetch(`/api/configs/${id}`, { method: 'DELETE' })
  if (res.ok) loadConfigs()
  else alert('删除失败')
}

// ===== 初始化 =====
loadConfigs()
loadModules()
