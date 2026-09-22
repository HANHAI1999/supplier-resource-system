import { feishuConfig } from '../../config/feishu.js'
import { list, listRecords, text } from '../../_lib/feishu.js'

export async function getExceptions() {
  const [suppliers, exceptions] = await Promise.all([
    listRecords(feishuConfig.tables.suppliers),
    listRecords(feishuConfig.tables.exceptions),
  ])
  const nameToId = new Map()
  for (const s of suppliers) {
    const n = text(s.fields['供应商名称'])
    if (n) nameToId.set(n, s.record_id)
  }
  return exceptions
    .filter((e) => text(e.fields['供应商名称']))
    .map((e) => {
      const f = e.fields
      return {
        id: e.record_id,
        supplierId: nameToId.get(text(f['供应商名称'])) || text(f['供应商名称']),
        refNo: text(f['关联编号']),
        time: text(f['异常时间']),
        bizTypes: list(f['涉及业务']),
        scenarios: list(f['服务场景']),
        regions: list(f['涉及区域']),
        status: text(f['处理状态']),
        desc: text(f['异常说明']),
        process: text(f['处理过程']),
        result: text(f['结果说明']),
        images: Array.isArray(f['相关图片']) ? f['相关图片'].map((x) => (typeof x === 'object' ? x.name || x.file_token || '' : x)) : [],
        processImages: [],
        resultImages: [],
      }
    })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_ORIGIN || '*')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    return res.status(200).json({ items: await getExceptions() })
  } catch (error) {
    return res.status(502).json({ error: error.message })
  }
}
