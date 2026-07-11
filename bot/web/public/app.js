const $ = (s) => document.querySelector(s)

// ===== SSE =====

const evtSource = new EventSource('/api/events')
evtSource.onmessage = (e) => {
  const d = JSON.parse(e.data)
  if (d.type === 'update') renderBots(d.bots)
}
evtSource.onerror = () => { $('#status').textContent = '状态: 重连中...' }
evtSource.onopen = () => { $('#status').textContent = '状态: 实时' }

// ===== 模块选择器 =====

let _modules = []

async function loadModules () {
  _modules = await fetch('/api/modules').then(r => r.json())
  buildModulePick('qeModulesDrop', _modules)
}

function buildModulePick (dropId, modules) {
  if (!modules.length) { $('#' + dropId).innerHTML = '<span class="mp-empty">暂无可用模块</span>'; return }
  $('#' + dropId).innerHTML = modules.map(m => `
    <label class="mp-item"><input type="checkbox" value="${esc(m)}"> ${esc(m)}</label>
  `).join('')
}

function toggleModulePick (pickId) {
  const drop = $('#' + pickId + 'Drop')
  drop.classList.toggle('show')
  // 点击外部关闭
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

// ===== 快速启动：加载配置列表 =====

async function loadConfigList () {
  const configs = await fetch('/api/configs').then(r => r.json())
  const el = $('#quickStartList')
  if (configs.length === 0) {
    el.innerHTML = '<span class="empty">暂无保存的配置，使用下方表单创建</span>'
    return
  }
  el.innerHTML = configs.map(c => `
    <div class="qs-card">
      <div class="qs-info">
        <strong>${esc(c.name)}</strong>
        <span>${esc(c.host)}:${c.port} · ${c.version || '自动'} · ${esc(c.username)}</span>
        <span class="qs-modules">${(c.modules || []).join(', ') || '无模块'}</span>
      </div>
      <button class="btn-start" onclick="launchBot(${c.id})">启动</button>
    </div>
  `).join('')
}

// ===== 快速新建并启动 =====

async function quickCreateAndStart () {
  const cfg = _readForm()
  if (!cfg.name) return alert('请输入备注名')
  const created = await _saveConfig(cfg)
  if (!created) return
  await launchBot(created.id)
}

async function quickSaveOnly () {
  const cfg = _readForm()
  if (!cfg.name) return alert('请输入备注名')
  await _saveConfig(cfg)
  _clearForm()
  loadConfigList()
}

function _readForm () {
  return {
    name: $('#qeName').value.trim(),
    host: $('#qeHost').value.trim() || 'localhost',
    port: parseInt($('#qePort').value) || 25565,
    version: $('#qeVersion').value.trim(),
    auth: $('#qeAuth').value,
    username: $('#qeUsername').value.trim() || 'Bot',
    modules: getCheckedModules('qeModulesDrop')
  }
}

async function _saveConfig (cfg) {
  const res = await fetch('/api/configs', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg)
  }).then(r => r.json())
  if (res.error) { alert('保存失败: ' + res.error); return null }
  return res
}

function _clearForm () {
  $('#qeName').value = ''
  $$('#qeModulesDrop input[type=checkbox]').forEach(cb => cb.checked = false)
}

// ===== 启动 / 停止 / 清理 =====

async function launchBot (configId) {
  try {
    const res = await fetch('/api/bots/start', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configId })
    })
    if (!res.ok) throw new Error((await res.json()).error)
    loadConfigList()
  } catch (err) { alert('启动失败: ' + err.message) }
}

async function stopBot (id) {
  if (!confirm('确定停止此机器人？')) return
  try {
    const res = await fetch(`/api/bots/stop/${id}`, { method: 'POST' })
    if (!res.ok) throw new Error((await res.json()).error)
  } catch (err) { alert('停止失败: ' + err.message) }
}

async function removeDead (id) {
  try { await fetch(`/api/bots/remove-dead/${id}`, { method: 'POST' }) } catch (_) { /* ignore */ }
}

// ===== 渲染 Bot 表格 =====

function renderBots (bots) {
  $('#botCount').textContent = `运行中: ${bots.length}`
  const tbody = $('#botTable tbody')
  if (bots.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="empty">没有运行中的机器人</td></tr>'
    return
  }
  tbody.innerHTML = bots.map(b => `
    <tr>
      <td><strong>${esc(b.name)}</strong></td>
      <td>${esc(b.username)}</td>
      <td>${esc(b.host)}:${b.port}</td>
      <td><span class="badge badge-${b.status}">${b.status}</span>${b.error ? `<br><small>${esc(b.error)}</small>` : ''}</td>
      <td>${b.health ?? '?'}</td>
      <td>${b.food ?? '?'}</td>
      <td>${b.position ? `${b.position.x} ${b.position.y} ${b.position.z}` : '?'}</td>
      <td>${b.dimension ?? '?'}</td>
      <td>${b.gameMode ?? '?'}</td>
      <td>${elapsed(b.startedAt)}</td>
      <td>
        ${b.status === 'online' || b.status === 'connecting'
          ? `<button class="btn-stop" onclick="stopBot('${b.id}')">停止</button>`
          : b.status === 'stopped' || b.status === 'kicked' || b.status === 'error'
            ? `<button class="btn-danger" onclick="removeDead('${b.id}')">清除</button>`
            : ''}
      </td>
    </tr>
  `).join('')
}

function esc (s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]) }

function elapsed (start) {
  if (!start) return '?'
  const diff = Date.now() - new Date(start).getTime()
  const m = Math.floor(diff / 60000)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}

// ===== 初始化 =====
loadConfigList()
loadModules()
