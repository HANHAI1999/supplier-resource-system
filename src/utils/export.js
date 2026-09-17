import * as XLSX from 'xlsx'

// 导出范围：全部 / 国内盘 / 美国盘 / 当前视图 / 当前筛选结果
export function pickScope(suppliers, scope, view, filtered) {
  if (scope === 'all') return suppliers
  if (scope === 'cn') return suppliers.filter((s) => (s.pools || []).includes('国内/后段资源盘'))
  if (scope === 'us') return suppliers.filter((s) => (s.pools || []).includes('美国供应商资源池'))
  if (scope === 'view') {
    if (view.kind === 'cn') return suppliers.filter((s) => (s.pools || []).includes('国内/后段资源盘'))
    if (view.id === 'us-west') return suppliers.filter((s) => (s.usPool || []).includes('美西'))
    if (view.id === 'us-east') return suppliers.filter((s) => (s.usPool || []).includes('美东'))
    return suppliers
  }
  return filtered // current-filtered
}

export function exportSuppliersXlsx(suppliers, exceptions, includeExceptions, scopeLabel) {
  const rows = suppliers.map((s) => ({
    供应商唯一ID: s.id,
    供应商名称: s.name,
    国家: s.country,
    是否签署合同: s.contract,
    供应商账期: s.paymentTerms,
    公司介绍: s.intro || '',
    合作状态: s.status,
    合作主体: s.entity,
    内部对接人: s.internalContact,
    资源盘归属: (s.pools || []).join('、'),
    覆盖区域: (s.regions || []).join('、'),
    国内区域业务配置: (s.cnConfigs || [])
      .map((c) => {
        let t = `${c.region}: 业务[${c.bizTypes.join('/')}] 场景[${c.scenarios.join('/')}]`
        if (c.fbaNote) t += ` FBA备注[${c.fbaNote}]`
        if (c.fbxNote) t += ` FBX备注[${c.fbxNote}]`
        return t
      })
      .join(' | '),
    美国资源池归属: (s.usPool || []).join('、'),
    美国区域服务能力配置: (s.abilityConfigs || [])
      .map((c) => `${c.region}: ${c.abilities.join('/')}`)
      .join(' | '),
    自有车队: s.fleet?.has ? '是' : '否',
    车头数量: s.fleet?.has ? s.fleet.trucks : '',
    车架数量: s.fleet?.has ? s.fleet.frames : '',
    车厢数量: s.fleet?.has ? s.fleet.boxes : '',
    自有仓库: s.warehouse?.has ? '是' : '否',
    仓库信息: s.warehouse?.has
      ? s.warehouse.list.map((w) => `${w.city || w.name}(${w.address}, 仓库面积 ${w.area})`).join(' | ')
      : '',
    联系人: (s.contacts || []).map((c) => `${c.name}(${c.title || ''}, ${c.methods}${c.note ? `, 备注:${c.note}` : ''})`).join(' | '),
    补充备注: s.remark || '',
    创建人: s.createdBy || '—',
    创建时间: s.createdAt || '—',
    最后修改人: s.updatedBy || '—',
    最后修改时间: s.updatedAt || '—',
  }))

  const wb = XLSX.utils.book_new()
  const ws1 = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws1, '供应商资源')

  if (includeExceptions) {
    const ids = new Set(suppliers.map((s) => s.id))
    const erows = exceptions
      .filter((e) => ids.has(e.supplierId))
      .map((e) => ({
        异常ID: e.id,
        供应商ID: e.supplierId,
        涉及业务: (e.bizTypes || []).join('、'),
        涉及区域: (e.regions || []).join('、'),
        关联编号: e.refNo || '',
        异常说明: e.desc || '',
        处理过程: e.process || '',
        结果说明: e.result || '',
        处理状态: e.status,
        附件引用: (e.images || []).concat(e.processImages || [], e.resultImages || []).join('、'),
      }))
    const ws2 = XLSX.utils.json_to_sheet(erows)
    XLSX.utils.book_append_sheet(wb, ws2, '异常记录')
  }

  const day = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `供应商资源导出_${scopeLabel}_${day}.xlsx`)
}
