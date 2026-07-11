const $ = (s) => document.querySelector(s)
const $$ = (s) => document.querySelectorAll(s)

// ===== SSE 实时更新 =====

const evtSource = new EventSource('/api/events')
evtSource.onmessage = (e) => {
  const d = JSON.parse(e.data)
  if (d.type === 'update') renderBots(d.bots)
}
evtSource.onerror = () => { $('#status').textContent = '状态: 重连中...' }
evtSource.onopen = () => { $('#status').textContent = '状态: 实时' }

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
  if (!cfg.name) return alert('请输入名称')
  const created = await fetch('/api/configs', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg)
  }).then(r => r.json())
  if (created.error) return alert('创建失败: ' + created.error)
  await launchBot(created.id)
}

async function quickSaveOnly () {
  const cfg = _readForm()
  if (!cfg.name) return alert('请输入名称')
  const res = await fetch('/api/configs', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg)
  }).then(r => r.json())
  if (res.error) return alert('保存失败: ' + res.error)
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
    modules: $('#qeModules').value.split(',').map(s => s.trim()).filter(Boolean)
  }
}

function _clearForm () {
  $('#qeName').value = ''
  $('#qeModules').value = ''
}

// ===== 启动 Bot =====

async function launchBot (configId) {
  try {
    const res = await fetch('/api/bots/start', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configId })
    })
    if (!res.ok) throw new Error((await res.json()).error)
    loadConfigList()
  } catch (err) {
    alert('启动失败: ' + err.message)
  }
}

// ===== 停止 Bot =====

async function stopBot (id) {
  if (!confirm('确定停止此机器人？')) return
  try {
    const res = await fetch(`/api/bots/stop/${id}`, { method: 'POST' })
    if (!res.ok) throw new Error((await res.json()).error)
  } catch (err) {
    alert('停止失败: ' + err.message)
  }
}

// ===== 渲染 Bot 表格 =====

function renderBots (bots) {
  $('#botCount').textContent = `运行中: ${bots.length}`
  const tbody = $('#botTable tbody')
  if (bots.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty">没有运行中的机器人 — 使用上方表单创建并启动</td></tr>'
    return
  }
  tbody.innerHTML = bots.map(b => `
    <tr>
      <td><strong>${esc(b.name)}</strong><br><small>${esc(b.username)}</small></td>
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

async function removeDead (id) {
  try {
    await fetch(`/api/bots/remove-dead/${id}`, { method: 'POST' })
  } catch (_) { /* ignore */ }
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
