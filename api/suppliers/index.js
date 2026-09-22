import { getSuppliers } from '../../_lib/suppliers.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_ORIGIN || '')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    // Phase 6 adds server-side identity and field/record permission checks here.
    return res.status(200).json({ items: await getSuppliers() })
  } catch (error) {
    return res.status(502).json({ error: error.message })
  }
}
