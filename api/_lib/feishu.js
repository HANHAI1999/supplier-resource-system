import { feishuConfig } from '../config/feishu.js'

const API_BASE = 'https://open.feishu.cn/open-apis'

async function getTenantToken() {
  const response = await fetch(`${API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: process.env.FEISHU_APP_ID, app_secret: process.env.FEISHU_APP_SECRET }),
  })
  const payload = await response.json()
  if (!response.ok || payload.code) throw new Error(payload.msg || 'Unable to get Feishu token')
  return payload.tenant_access_token
}

export async function listRecords(tableId) {
  if (!feishuConfig.appToken) throw new Error('FEISHU_BITABLE_APP_TOKEN is not configured')
  const token = await getTenantToken()
  const records = []
  let pageToken = ''
  do {
    const url = new URL(`${API_BASE}/bitable/v1/apps/${feishuConfig.appToken}/tables/${tableId}/records`)
    url.searchParams.set('page_size', '500')
    if (pageToken) url.searchParams.set('page_token', pageToken)
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const payload = await response.json()
    if (!response.ok || payload.code) throw new Error(payload.msg || 'Unable to list Feishu records')
    records.push(...(payload.data.items || []))
    pageToken = payload.data.has_more ? payload.data.page_token : ''
  } while (pageToken)
  return records
}

export function text(value) {
  if (Array.isArray(value)) return value.map((item) => (typeof item === 'object' ? item.text || item.name : item)).join(', ')
  return value ?? ''
}

export function list(value) {
  if (!Array.isArray(value)) return value ? [value] : []
  return value.map((item) => (typeof item === 'object' ? item.text || item.name : item))
}
