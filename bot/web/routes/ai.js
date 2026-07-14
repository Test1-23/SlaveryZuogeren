/**
 * AI 模块路由
 */

const { Router } = require('express')
const https = require('https')

function mount (app, { manager }) {
  const r = Router()

  // 获取 AI 状态
  r.get('/:id/ai', (req, res) => {
    const bot = manager.getBot(req.params.id)
    if (!bot) return res.status(404).json({ error: 'Bot 不存在' })
    if (!bot._ai) return res.json({ status: 'not_loaded', lastError: null, context: null, history: [] })
    const systemConfig = require('../../systemConfig')
    res.json({
      status: bot._ai.status,
      lastError: bot._ai.lastError,
      lastCall: bot._ai.lastCall,
      totalCalls: bot._ai.totalCalls,
      totalErrors: bot._ai.totalErrors,
      context: bot._ai.context,
      history: bot._ai.history,
      fewshots: systemConfig.get('aiFewshots') || []
    })
  })

  // 更新 AI 配置 (system prompt / maxHistory / 清空上下文)
  r.put('/:id/ai', (req, res) => {
    const bot = manager.getBot(req.params.id)
    if (!bot) return res.status(404).json({ error: 'Bot 不存在' })
    if (!bot._ai) return res.status(400).json({ error: 'AI 模块未加载' })

    const systemConfig = require('../../systemConfig')
    const { systemPrompt, maxHistory, clearHistory, fewshots } = req.body

    if (systemPrompt !== undefined) {
      bot._ai.context.systemPrompt = systemPrompt
      systemConfig.update({ aiSystemPrompt: systemPrompt })
    }
    if (maxHistory !== undefined) {
      bot._ai.context.maxHistory = Math.max(1, Math.min(50, Number(maxHistory) || 10))
    }
    if (clearHistory) {
      bot._ai.history = []
    }
    if (fewshots !== undefined) {
      systemConfig.update({ aiFewshots: fewshots })
    }

    res.json({
      context: bot._ai.context,
      history: bot._ai.history
    })
  })

  // 测试 API 连接
  r.post('/:id/ai/test', async (req, res) => {
    const bot = manager.getBot(req.params.id)
    if (!bot) return res.status(404).json({ error: 'Bot 不存在' })

    const systemConfig = require('../../systemConfig')
    const apiKey = req.body.apiKey || systemConfig.get('deepseekApiKey')
    const model = req.body.model || systemConfig.get('deepseekModel') || 'deepseek-v4-flash'

    if (!apiKey) return res.status(400).json({ error: '未配置 API Key' })

    try {
      const result = await _testApi(apiKey, model)
      res.json({ success: true, response: result })
    } catch (err) {
      res.json({ success: false, error: err.message })
    }
  })

  app.use('/api/bots', r)
}

function _testApi (apiKey, model) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 20
    })

    const req = https.request({
      hostname: 'api.deepseek.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 10000
    }, (res) => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.error) return reject(new Error(json.error.message || 'API 错误'))
          resolve(json.choices?.[0]?.message?.content?.trim() || '(空响应)')
        } catch (e) {
          reject(new Error('解析响应失败'))
        }
      })
    })

    req.on('error', (e) => reject(new Error('连接失败: ' + e.message)))
    req.on('timeout', () => { req.destroy(); reject(new Error('连接超时')) })
    req.write(body)
    req.end()
  })
}

module.exports = { mount }
