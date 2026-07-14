/**
 * v4fchat 模块 — DeepSeek V4 Flash 自动聊天回复
 *
 * 依赖 chat 模块（自动加载）。
 * API Key 和 system prompt 通过 Web UI 设置。
 *
 * 注入后:
 *   bot._ai = { status, context, history }
 *   bot.on('chatMessage') → 调用 DeepSeek → bot.sendChat()
 */

const https = require('https')

const DEFAULT_SYSTEM_PROMPT = `你是一个 Minecraft 机器人。玩家们在游戏内聊天，你用中文简短回复（1-2句话）。你的名字是 Bot。说话风格像普通玩家。`

module.exports = {
  name: 'v4fchat',
  version: '1.0.0',
  dependencies: ['chat'],

  inject (bot, options) {
    const systemConfig = require('../../systemConfig')

    // AI 状态 — 暴露给 Web UI
    bot._ai = {
      status: 'idle',       // 'idle' | 'calling' | 'ok' | 'error'
      lastError: null,
      lastCall: null,        // timestamp
      totalCalls: 0,
      totalErrors: 0,
      context: {
        systemPrompt: systemConfig.get('aiSystemPrompt') || DEFAULT_SYSTEM_PROMPT,
        maxHistory: 10
      },
      history: []             // [{role, content, timestamp}]
    }

    /**
     * 处理聊天消息 → 调用 AI
     */
    bot._v4fchat_onMsg = async (msg) => {
      if (msg.type !== 'player' && msg.type !== 'whisper') return
      if (msg.username === bot.username) return

      const apiKey = systemConfig.get('deepseekApiKey')
      if (!apiKey) return

      const model = systemConfig.get('deepseekModel') || 'deepseek-v4-flash'
      const systemPrompt = bot._ai.context.systemPrompt
      const prompt = msg.type === 'whisper' ? `(私聊) ${msg.username}: ${msg.message}` : `${msg.username}: ${msg.message}`

      bot._ai.status = 'calling'
      bot._ai.lastCall = Date.now()
      bot.emit('aiStatus', bot._ai.status)

      try {
        // 构建消息列表：system + fewshots + 历史 + 当前
        const fewshots = systemConfig.get('aiFewshots') || []
        const messages = [
          { role: 'system', content: systemPrompt },
          ...fewshots.flatMap(f => [{ role: 'user', content: f.user }, { role: 'assistant', content: f.assistant }]),
          ...bot._ai.history.map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: prompt }
        ]

        const reply = await _callDeepSeek(apiKey, model, messages)
        if (reply) {
          // 保存到对话历史
          bot._ai.history.push({ role: 'user', content: prompt, timestamp: Date.now() })
          bot._ai.history.push({ role: 'assistant', content: reply, timestamp: Date.now() })
          // 限制历史长度
          const maxPairs = bot._ai.context.maxHistory
          while (bot._ai.history.length > maxPairs * 2) bot._ai.history.shift()

          bot._ai.status = 'ok'
          bot._ai.totalCalls++
          bot.emit('aiStatus', bot._ai.status)
          bot.sendChat(reply)
        } else {
          bot._ai.status = 'ok'
          bot._ai.totalCalls++
          bot.emit('aiStatus', bot._ai.status)
        }
      } catch (err) {
        bot._ai.status = 'error'
        bot._ai.lastError = err.message
        bot._ai.totalCalls++
        bot._ai.totalErrors++
        bot.emit('aiStatus', bot._ai.status)
        console.error('[v4fchat] API 失败:', err.message)
      }
    }

    bot.on('chatMessage', bot._v4fchat_onMsg)
    console.log('[v4fchat] 模块已注入 (依赖 chat)')
  },

  unload (bot) {
    bot.removeListener('chatMessage', bot._v4fchat_onMsg)
    delete bot._v4fchat_onMsg
    delete bot._ai
    console.log('[v4fchat] 模块已卸载')
  }
}

function _callDeepSeek (apiKey, model, messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model, messages, max_tokens: 200, temperature: 0.8 })

    const req = https.request({
      hostname: 'api.deepseek.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 15000
    }, (res) => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.error) return reject(new Error(json.error.message || 'API 返回错误'))
          const text = json.choices?.[0]?.message?.content
          resolve(text?.trim() || null)
        } catch (e) {
          reject(new Error('解析 API 响应失败'))
        }
      })
    })

    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('API 超时 (15s)')) })
    req.write(body)
    req.end()
  })
}
