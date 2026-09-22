// 云端 API 服务：Vercel 同域部署时用相对路径 /api；也可用 VITE_API_BASE_URL 指定绝对地址
const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export function isCloudApiConfigured() {
  return true // 总是尝试拉取；失败时静默降级到本地数据
}

export async function fetchCloudSuppliers() {
  const response = await fetch(`${apiBase}/api/suppliers`)
  if (!response.ok) return null
  const payload = await response.json()
  return Array.isArray(payload.items) ? payload.items : null
}

export async function fetchCloudExceptions() {
  const response = await fetch(`${apiBase}/api/exceptions`)
  if (!response.ok) return null
  const payload = await response.json()
  return Array.isArray(payload.items) ? payload.items : null
}
