const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')

export function isCloudApiConfigured() {
  return Boolean(apiBase)
}

export async function fetchCloudSuppliers() {
  if (!apiBase) return null
  const response = await fetch(`${apiBase}/api/suppliers`)
  if (!response.ok) throw new Error('供应商云端数据加载失败')
  const payload = await response.json()
  return payload.items || []
}
