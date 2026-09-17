// 树拍平为带层级前缀的选项列表（用于编辑表单里的区域/能力下拉选择）
export function flattenForest(forest) {
  const out = []
  function walk(nodes, prefix) {
    for (const n of nodes) {
      const label = prefix ? `${prefix} / ${n.label}` : n.label
      out.push({ value: n.value, label })
      if (n.children) walk(n.children, label)
    }
  }
  walk(forest, '')
  return out
}

// 收集 value -> label 映射
export function collectLabels(forest, map = {}) {
  for (const n of forest) {
    map[n.value] = n.label
    if (n.children) collectLabels(n.children, map)
  }
  return map
}

// 供应商覆盖区域 = 国内/美国配置组「适用区域」的并集（自动汇总，不再手动维护）
export function deriveRegions(supplier) {
  if (!supplier) return []
  const set = new Set()
  for (const c of supplier.cnConfigs || []) if (c.region) set.add(c.region)
  for (const c of supplier.abilityConfigs || []) if (c.region) set.add(c.region)
  return [...set]
}
