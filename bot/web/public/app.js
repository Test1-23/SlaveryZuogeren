// $ and $$ now in shared.js

let _activeChatBot = null
let _chatPollTimer = null

// ===== SSE =====

const evtSource = new EventSource('/api/events')
evtSource.onmessage = (e) => {
  const d = JSON.parse(e.data)
  if (d.type === 'update') renderBots(d.bots)
}
evtSource.onerror = () => { $('#status').textContent = '状态: 重连中...' }
evtSource.onopen = () => { $('#status').textContent = '状态: 实时' }

// ===== 系统资源监控 =====

async function refreshSysInfo () {
  try {
    const s = await fetch('/api/system').then(r => r.json())
    $('#sysInfo').textContent = `mem: ${s.memory.rss}MB · heap: ${s.memory.heapUsed}/${s.memory.heapTotal}MB · pid: ${s.pid} · up: ${_fmtUptime(s.uptime)}`
  } catch (e) {
    $('#sysInfo').textContent = 'mem: ? · cpu: ?'
    console.warn('[sysInfo] 获取系统资源失败:', e.message)
  }
}
setInterval(refreshSysInfo, 3000)
refreshSysInfo()

function _fmtUptime (s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h${m}m` : `${m}m`
}

// ===== 模块选择器 (buildModulePick/toggleModulePick/getCheckedModules/setCheckedModules now in shared.js) =====

let _modules = []

async function loadModules () {
  try { _modules = await safeFetch('/api/modules') } catch { _modules = [] }
  buildModulePick('qeModulesDrop', _modules)
}

// ===== 快速启动：加载配置列表 =====

async function loadConfigList () {
  let configs = []
  try { configs = await safeFetch('/api/configs') } catch { /* show empty */ }
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
      <div class="qs-actions">
        <button class="btn-start" onclick="launchBot(${c.id})">启动</button>
        <button class="btn-edit" onclick="startEdit(${c.id})">编辑</button>
      </div>
    </div>
  `).join('')
}

// ===== 快速新建 =====

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
  try {
    return await safeFetch('/api/configs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) })
  } catch (err) { alert('保存失败: ' + err.message); return null }
}

function _clearForm () {
  $('#qeName').value = ''
  $$('#qeModulesDrop input[type=checkbox]').forEach(cb => cb.checked = false)
}

// ===== 编辑已保存配置 =====

async function startEdit (configId) {
  let cfg
  try { cfg = await safeFetch(`/api/configs/${configId}`) } catch { return alert('加载失败') }
  $('#qeEditId').value = cfg.id
  $('#qeTitle').textContent = '编辑: ' + cfg.name
  $('#qeName').value = cfg.name
  $('#qeHost').value = cfg.host
  $('#qePort').value = cfg.port
  $('#qeVersion').value = cfg.version || ''
  $('#qeAuth').value = cfg.auth
  $('#qeUsername').value = cfg.username
  setCheckedModules('qeModulesDrop', cfg.modules || [])
  $('#qeSaveStartBtn').textContent = '保存并启动'
  $('#qeSaveBtn').textContent = '保存修改'
  $('#quickEditor').classList.remove('hidden')
  $('#quickEditor').scrollIntoView({ behavior: 'smooth' })
}

function cancelEdit () {
  $('#qeEditId').value = ''
  $('#qeTitle').textContent = '快速新建机器人'
  $('#qeSaveStartBtn').textContent = '创建并启动'
  $('#qeSaveBtn').textContent = '仅保存'
  _clearForm()
  $('#quickEditor').classList.add('hidden')
}

async function quickCreateAndStart () {
  const eid = $('#qeEditId').value
  if (eid) {
    // 编辑模式：先保存再启动
    const updated = await _saveUpdate(eid)
    if (!updated) return
    await launchBot(updated.id)
    cancelEdit()
  } else {
    const cfg = _readForm()
    if (!cfg.name) return alert('请输入备注名')
    const created = await _saveConfig(cfg)
    if (!created) return
    await launchBot(created.id)
  }
}

async function quickSaveOnly () {
  const eid = $('#qeEditId').value
  if (eid) {
    await _saveUpdate(eid)
    cancelEdit()
    loadConfigList()
  } else {
    const cfg = _readForm()
    if (!cfg.name) return alert('请输入备注名')
    await _saveConfig(cfg)
    _clearForm()
    loadConfigList()
  }
}

async function _saveUpdate (id) {
  const data = _readForm()
  if (!data.name) { alert('备注名不能为空'); return null }
  try {
    return await safeFetch(`/api/configs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  } catch (err) { alert('保存失败: ' + err.message); return null }
}

// ===== Bot 操作 =====

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
    if (_activeChatBot === id) { _activeChatBot = null; updateChatPanel([]) }
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
    tbody.innerHTML = '<tr><td colspan="10" class="empty">没有运行中的机器人</td></tr>'
  } else {
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
        <td>${elapsed(b.startedAt)}</td>
        <td>
          ${b.status === 'online' || b.status === 'connecting'
            ? `<button class="btn-stop" onclick="stopBot('${b.id}')">停止</button>`
            : `<button class="btn-danger" onclick="removeDead('${b.id}')">清除</button>`}
          ${b.status === 'online' ? `<button class="btn-edit" style="margin-left:4px" onclick="openChat('${b.id}','${esc(b.name)}')">聊天</button>` : ''}
          ${b.status === 'online' ? `<button class="btn-edit" style="margin-left:4px;background:var(--accent)" onclick="showModuleSwap('${b.id}','${esc(b.name)}')">模块</button>` : ''}
        </td>
      </tr>
    `).join('')
  }
  // 更新 AI 面板
  updateAiPanel(bots)

  // 更新在线玩家
  renderPlayers(bots)

  // 更新聊天面板的 bot 选择器
  const sel = $('#chatBotSelect')
  const online = bots.filter(b => b.status === 'online')
  sel.innerHTML = online.map(b => `<option value="${b.id}">${esc(b.name)} (${esc(b.username)})</option>`).join('')
  if (online.length === 0) {
    $('#chatPanel').classList.add('hidden')
    _activeChatBot = null
    clearInterval(_chatPollTimer)
  } else if (!_activeChatBot || !online.find(b => b.id === _activeChatBot)) {
    // 默认选第一个在线 bot
    if (online[0]) openChat(online[0].id, online[0].name)
  }
}

// ===== 在线玩家 =====

function renderPlayers (bots) {
  const online = bots.filter(b => b.status === 'online')
  // 去重合并所有 bot 看到的玩家
  const seen = new Set()
  const players = []
  for (const b of online) {
    for (const p of (b.players || [])) {
      if (!seen.has(p.username)) {
        seen.add(p.username)
        players.push(p)
      }
    }
  }
  $('#playerCount').textContent = `在线玩家: ${players.length}`
  const el = $('#playerList')
  if (players.length === 0) {
    el.innerHTML = '<span class="empty" style="display:block;padding:12px;font-size:13px">暂无其他玩家</span>'
    return
  }
  el.innerHTML = players.map(p => `
    <div class="player-tag">
      <span class="player-dot"></span>
      ${esc(p.username)}
      <span style="font-size:11px;color:var(--text-muted);margin-left:4px">${p.ping ?? '?'}ms</span>
    </div>
  `).join('')
}

// ===== 聊天面板 =====

function openChat (botId, name) {
  _activeChatBot = botId
  $('#chatBotSelect').value = botId
  $('#chatPanel').classList.remove('hidden')
  $('#chatMessages').innerHTML = '<span class="empty">加载中...</span>'
  fetchChat()
  clearInterval(_chatPollTimer)
  _chatPollTimer = setInterval(fetchChat, 1000)
}

function switchChatBot () {
  const id = $('#chatBotSelect').value
  if (id) openChat(id, '')
}

async function fetchChat () {
  if (!_activeChatBot) return
  const msgs = await fetch(`/api/bots/${_activeChatBot}/chat`).then(r => r.json()).catch(() => [])
  updateChatPanel(msgs)
}

function updateChatPanel (msgs) {
  const el = $('#chatMessages')
  const wasAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10
  if (!msgs || msgs.length === 0) {
    el.innerHTML = '<span class="empty">暂无消息</span>'
    return
  }
  el.innerHTML = msgs.map(m => {
    const time = new Date(m.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    if (m.type === 'player') {
      return `<div class="chat-msg"><span class="chat-time">${time}</span> <span class="chat-user">${esc(m.username)}</span>: ${esc(m.message)}</div>`
    }
    if (m.type === 'whisper') {
      return `<div class="chat-msg chat-whisper"><span class="chat-time">${time}</span> <span class="chat-user">${esc(m.username)}</span> → 你: ${esc(m.message)}</div>`
    }
    return `<div class="chat-msg chat-system"><span class="chat-time">${time}</span> ${esc(m.message)}</div>`
  }).join('')
  if (wasAtBottom) el.scrollTop = el.scrollHeight
}

async function sendChat () {
  const input = $('#chatInput')
  const msg = input.value.trim()
  if (!msg || !_activeChatBot) return
  input.value = ''
  try {
    const res = await fetch(`/api/bots/${_activeChatBot}/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    })
    if (!res.ok) throw new Error((await res.json()).error)
    // 立即刷新
    fetchChat()
  } catch (err) { alert('发送失败: ' + err.message) }
}

function clearChat () {
  $('#chatMessages').innerHTML = '<span class="empty">暂无消息</span>'
}

// ===== 工具函数 (esc now in shared.js) =====

function elapsed (start) {
  if (!start) return '?'
  const diff = Date.now() - new Date(start).getTime()
  const m = Math.floor(diff / 60000)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}

// ===== AI 面板 =====

let _aiPollTimer = null
let _activeAiBot = null

function updateAiPanel (bots) {
  const sel = $('#aiBotSelect')
  const online = bots.filter(b => b.status === 'online' && (b.modules || []).some(m => m.name === 'v4fchat'))
  sel.innerHTML = online.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('')
  if (online.length === 0) {
    $('#aiPanel').classList.add('hidden')
    _activeAiBot = null
    clearInterval(_aiPollTimer)
  } else if (!_activeAiBot || !online.find(b => b.id === _activeAiBot)) {
    if (online[0]) openAi(online[0].id)
  } else {
    // 保持当前 bot，更新连接状态
    const bot = bots.find(b => b.id === _activeAiBot)
    if (bot) updateAiStatusBadge(bot.modules)
  }
}

function openAi (botId) {
  _activeAiBot = botId
  $('#aiBotSelect').value = botId
  $('#aiPanel').classList.remove('hidden')
  loadAiConfig() // 初始加载配置字段
  fetchAiState()
  clearInterval(_aiPollTimer)
  _aiPollTimer = setInterval(fetchAiState, 2000)
}

async function loadAiConfig () {
  if (!_activeAiBot) return
  const data = await fetch(`/api/bots/${_activeAiBot}/ai`).then(r => r.json()).catch(() => null)
  if (data && data.context) {
    $('#aiSystemPrompt').value = data.context.systemPrompt || ''
    $('#aiMaxHistory').value = data.context.maxHistory || 10
    renderFewshots(data.fewshots || [])
  }
}

function renderAiHistory (data) {
  if (!data || !data.history || data.history.length === 0) {
    return
  }
  $('#aiLog').innerHTML = data.history.map(h => {
    const role = h.role === 'user' ? '玩家' : 'AI'
    const cls = h.role === 'user' ? 'chat-user' : 'chat-system'
    return `<div class="chat-msg"><span class="chat-time">${new Date(h.timestamp).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span> <span class="${cls}">[${role}]</span> ${esc(h.content)}</div>`
  }).join('')
  $('#aiLog').scrollTop = $('#aiLog').scrollHeight
}

function switchAiBot () {
  const id = $('#aiBotSelect').value
  if (id) openAi(id)
}

async function fetchAiState () {
  if (!_activeAiBot) return
  try {
    const data = await fetch(`/api/bots/${_activeAiBot}/ai`).then(r => r.json()).catch(() => null)
    if (!data || data.status === 'not_loaded') {
      $('#aiStatusBadge').textContent = '未加载'
      $('#aiStatusBadge').className = 'badge badge-stopped'
      return
    }
    updateAiStatusBadge([{ name: 'v4fchat' }])
    $('#aiStatusBadge').textContent = data.status
    $('#aiStatusBadge').className = `badge badge-${data.status === 'ok' || data.status === 'idle' ? 'online' : data.status === 'calling' ? 'connecting' : 'error'}`
    $('#aiStats').innerHTML = data.lastError
      ? `<div style="color:var(--red);margin-bottom:4px">错误: ${esc(data.lastError)}</div>` + _statsHtml(data)
      : _statsHtml(data)
    renderAiHistory(data)
  } catch (_) { /* ignore */ }
}

function _statsHtml (data) {
  return `调用: ${data.totalCalls || 0} 次 · 错误: ${data.totalErrors || 0} 次 · 最后: ${data.lastCall ? new Date(data.lastCall).toLocaleTimeString('zh-CN') : '-'}`
}

async function saveAiConfig () {
  if (!_activeAiBot) return
  const body = {
    systemPrompt: $('#aiSystemPrompt').value.trim(),
    maxHistory: parseInt($('#aiMaxHistory').value) || 10,
    fewshots: _collectFewshots()
  }
  try {
    const res = await fetch(`/api/bots/${_activeAiBot}/ai`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error((await res.json()).error)
    $('#aiSystemPrompt').value = body.systemPrompt
    $('#aiMaxHistory').value = body.maxHistory
    $('#aiSaveMsg').textContent = '已保存'
    setTimeout(() => { $('#aiSaveMsg').textContent = '' }, 2000)
  } catch (err) { alert('保存失败: ' + err.message) }
}

// ===== Few-Shots =====

function _collectFewshots () {
  const pairs = []
  $$('#aiFewshots .fs-row').forEach(row => {
    const user = row.querySelector('.fs-user').value.trim()
    const assistant = row.querySelector('.fs-assistant').value.trim()
    if (user || assistant) pairs.push({ user, assistant })
  })
  return pairs
}

function renderFewshots (fewshots) {
  const el = $('#aiFewshots')
  if (!fewshots || fewshots.length === 0) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:6px 0">暂无示例，点击添加</div>'
    return
  }
  el.innerHTML = fewshots.map((fs, i) => `
    <div class="fs-row">
      <div class="fs-label">用户</div>
      <input class="inp fs-user" value="${esc(fs.user || '')}" placeholder="玩家说的话...">
      <div class="fs-label">AI</div>
      <input class="inp fs-assistant" value="${esc(fs.assistant || '')}" placeholder="AI 回复...">
      <button class="btn-danger" style="font-size:10px;padding:2px 6px" onclick="this.closest('.fs-row').remove()">✕</button>
    </div>
  `).join('')
}

function addFewshot () {
  const el = $('#aiFewshots')
  // 清除空状态
  if (el.querySelector('.empty')) el.innerHTML = ''
  const row = document.createElement('div')
  row.className = 'fs-row'
  row.innerHTML = `
    <div class="fs-label">用户</div>
    <input class="inp fs-user" placeholder="玩家说的话...">
    <div class="fs-label">AI</div>
    <input class="inp fs-assistant" placeholder="AI 回复...">
    <button class="btn-danger" style="font-size:10px;padding:2px 6px" onclick="this.closest('.fs-row').remove()">✕</button>
  `
  el.appendChild(row)
  row.querySelector('.fs-user').focus()
}

async function testAiConnection () {
  if (!_activeAiBot) return
  $('#aiStatusBadge').textContent = '测试中...'
  $('#aiStatusBadge').className = 'badge badge-connecting'
  try {
    const res = await fetch(`/api/bots/${_activeAiBot}/ai/test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    const data = await res.json()
    if (data.success) {
      $('#aiStatusBadge').textContent = 'ok'
      $('#aiStatusBadge').className = 'badge badge-online'
      $('#aiStats').innerHTML = `<div style="color:var(--green)">连接成功: ${esc(data.response)}</div>` + $('#aiStats').innerHTML
    } else {
      $('#aiStatusBadge').textContent = 'error'
      $('#aiStatusBadge').className = 'badge badge-error'
      $('#aiStats').innerHTML = `<div style="color:var(--red)">测试失败: ${esc(data.error)}</div>` + $('#aiStats').innerHTML
    }
  } catch (err) {
    $('#aiStatusBadge').textContent = 'error'
    $('#aiStatusBadge').className = 'badge badge-error'
  }
}

async function clearAiHistory () {
  if (!_activeAiBot || !confirm('清空 AI 对话历史？')) return
  try {
    await safeFetch(`/api/bots/${_activeAiBot}/ai`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clearHistory: true }) })
    fetchAiState()
  } catch (err) { alert('清空失败: ' + err.message) }
}

function updateAiStatusBadge (modules) {
  const hasAi = modules && modules.some(m => m.name === 'v4fchat')
  if (!hasAi) {
    $('#aiStatusBadge').textContent = '未加载'
    $('#aiStatusBadge').className = 'badge badge-stopped'
  }
}

// ===== 系统设置 =====

async function showSettings () {
  let cfg = {}
  try { cfg = await safeFetch('/api/settings') } catch { /* keep defaults */ }
  $('#setApiKey').value = cfg.deepseekApiKey || ''
  $('#setModel').value = cfg.deepseekModel || 'deepseek-v4-flash'
  $('#settingsOverlay').classList.remove('hidden')
}

function hideSettings () {
  $('#settingsOverlay').classList.add('hidden')
}

async function saveSettings () {
  try {
    const res = await fetch('/api/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deepseekApiKey: $('#setApiKey').value.trim(),
        deepseekModel: $('#setModel').value.trim() || 'deepseek-v4-flash'
      })
    })
    if (!res.ok) throw new Error((await res.json()).error)
    hideSettings()
  } catch (err) { alert('保存失败: ' + err.message) }
}

// ===== 模块热插拔 =====

let _swapBotId = null

async function showModuleSwap (botId, name) {
  _swapBotId = botId
  $('#modSwapTitle').textContent = `模块管理: ${name}`
  $('#moduleSwapOverlay').classList.remove('hidden')
  await refreshModuleSwap()
}

function hideModuleSwap () {
  $('#moduleSwapOverlay').classList.add('hidden')
  _swapBotId = null
}

async function refreshModuleSwap () {
  if (!_swapBotId) return
  const data = await fetch(`/api/bots/${_swapBotId}/modules`).then(r => r.json()).catch(() => ({ loaded: [], available: [] }))

  $('#modSwapLoaded').innerHTML = data.loaded.length
    ? data.loaded.map(m => `
        <div class="mod-row mod-loaded">
          <span><strong>${esc(m.name)}</strong> <span class="mod-ver">v${m.version || '?'}</span></span>
          <button class="btn-danger" style="font-size:11px;padding:3px 8px" onclick="swapModule('unload','${esc(m.name)}')">卸载</button>
        </div>`).join('')
    : '<div style="font-size:13px;color:var(--text-muted);padding:8px 0">无已加载模块</div>'

  $('#modSwapAvailable').innerHTML = data.available.length
    ? data.available.map(m => `
        <div class="mod-row mod-avail">
          <span>
            <strong class="${m.canLoad ? '' : 'mod-disabled'}">${esc(m.name)}</strong>
            <span class="mod-ver">v${m.version || '?'}</span>
            ${m.dependencies.length ? `<span class="mp-dep-tag">依赖 ${m.dependencies.join(', ')}</span>` : ''}
          </span>
          <button class="btn-start" style="font-size:11px;padding:3px 8px"
            ${m.canLoad ? `onclick="swapModule('load','${esc(m.name)}')"` : 'disabled'}>
            加载
          </button>
        </div>`).join('')
    : '<div style="font-size:13px;color:var(--text-muted);padding:8px 0">所有模块已加载</div>'
}

async function swapModule (action, name) {
  if (!_swapBotId) return
  try {
    await safeFetch(`/api/bots/${_swapBotId}/modules/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    refreshModuleSwap()
  } catch (err) { alert(`${action}失败: ` + err.message) }
}

// ===== 初始化 =====
loadConfigList()
loadModules()
