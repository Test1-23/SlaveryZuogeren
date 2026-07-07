/**
 * 仪表盘页面逻辑
 */

const $ = (s) => document.querySelector(s)
const $$ = (s) => document.querySelectorAll(s)

// ===== SSE 实时更新 =====

const evtSource = new EventSource('/api/events')

evtSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data.type === 'update') {
    renderBots(data.bots)
  }
}

evtSource.onerror = () => {
  $('#status').textContent = '状态: 连接断开，正在重连...'
}

evtSource.onopen = () => {
  $('#status').textContent = '状态: 已连接 (实时)'
}

// ===== 渲染 Bot 列表 =====

function renderBots (bots) {
  const tbody = $('#botTable tbody')
  $('#botCount').textContent = `运行中: ${bots.length}`

  if (bots.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty">没有运行中的机器人</td></tr>'
    return
  }

  tbody.innerHTML = bots.map(bot => `
    <tr>
      <td><strong>${esc(bot.name)}</strong><br><small>${esc(bot.username)}</small></td>
      <td>${esc(bot.host)}:${bot.port}</td>
      <td><span class="status status-${bot.status}">${bot.status}</span>${bot.error ? `<br><small>${esc(bot.error)}</small>` : ''}</td>
      <td>${bot.health ?? '?'}</td>
      <td>${bot.food ?? '?'}</td>
      <td>${bot.position ? `${bot.position.x}, ${bot.position.y}, ${bot.position.z}` : '?'}</td>
      <td>${bot.dimension ?? '?'}</td>
      <td>${bot.gameMode ?? '?'}</td>
      <td>${elapsed(bot.startedAt)}</td>
      <td>
        ${bot.status === 'online' || bot.status === 'connecting'
          ? `<button class="btn-stop" onclick="stopBot('${bot.id}')">停止</button>`
          : `<span class="status status-stopped">已停止</span>`}
      </td>
    </tr>
  `).join('')
}

function esc (s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]) }

function elapsed (start) {
  if (!start) return '?'
  const diff = Date.now() - new Date(start).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  if (hrs > 0) return `${hrs}h ${mins % 60}m`
  return `${mins}m`
}

// ===== 停止 Bot =====

async function stopBot (id) {
  if (!confirm('确定要停止这个机器人吗？')) return
  try {
    const res = await fetch(`/api/bots/stop/${id}`, { method: 'POST' })
    if (!res.ok) throw new Error((await res.json()).error)
  } catch (err) {
    alert('停止失败: ' + err.message)
  }
}
