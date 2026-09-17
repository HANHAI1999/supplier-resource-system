// 筛选判定核心逻辑
// 规则来源：需求文档第 4、5、7 节
// - 多选条件统一 AND
// - 父级配置继承给未单独配置的下级节点
// - 节点例外优先于父级继承
import { regionForest } from '../data/regions'
import { serviceAbilityTree } from '../data/serviceAbilities'
import { deriveRegions } from './options'

// 构建 parent 映射与 descendants 集合（含自身）
function buildMaps(forest) {
  const parent = {}
  const desc = {}
  function walk(node, p) {
    parent[node.value] = p ? p.value : null
    desc[node.value] = new Set([node.value])
    for (const c of node.children || []) {
      walk(c, node)
      for (const v of desc[c.value]) desc[node.value].add(v)
    }
  }
  forest.forEach((n) => walk(n, null))
  return { parent, desc }
}

const regionMaps = buildMaps(regionForest)
const abilityMaps = buildMaps(serviceAbilityTree)

// 沿父链向上查找节点的配置；未找到返回 null（未配置 = 不命中）
function resolveConfig(configs, regionValue) {
  let cur = regionValue
  while (cur) {
    const hit = configs.find((c) => c.region === cur)
    if (hit) return hit
    cur = regionMaps.parent[cur]
  }
  return null
}

// 供应商覆盖区域与筛选区域是否存在祖先/后代关系
function regionOverlaps(supplierRegions, filterRegion) {
  return supplierRegions.some(
    (c) =>
      (regionMaps.desc[filterRegion] && regionMaps.desc[filterRegion].has(c)) ||
      (regionMaps.desc[c] && regionMaps.desc[c].has(filterRegion))
  )
}

// 筛选区域及其子孙节点集合（父级筛选 = 区域内任一点具备即算）
function regionScope(r) {
  return [r, ...(regionMaps.desc[r] || [r])]
}

// 聚合作用域内有效配置的业务类型 / 服务场景（并集）
function aggregateCn(s, regions) {
  const biz = new Set()
  const scn = new Set()
  const cfgs = regions
    ? regions.flatMap((r) => regionScope(r).map((node) => resolveConfig(s.cnConfigs, node)).filter(Boolean))
    : s.cnConfigs
  for (const c of cfgs) {
    ;(c.bizTypes || []).forEach((b) => biz.add(b))
    ;(c.scenarios || []).forEach((x) => scn.add(x))
  }
  return { biz, scn }
}

// 聚合作用域内有效配置的服务能力（并集）
function aggregateAbil(s, regions) {
  const set = new Set()
  const cfgs = regions
    ? regions.flatMap((r) => regionScope(r).map((node) => resolveConfig(s.abilityConfigs, node)).filter(Boolean))
    : s.abilityConfigs
  for (const c of cfgs) (c.abilities || []).forEach((a) => set.add(a))
  return set
}

// 能力集合是否满足筛选能力：存在配置项是筛选项的子孙（含自身）即满足
function abilitySatisfies(set, filterAbility) {
  const d = abilityMaps.desc[filterAbility]
  if (!d) return false
  for (const c of set) if (d.has(c)) return true
  return false
}

// 国内维度判定（业务类型 + 服务场景，区域逐区 AND）
function judgeCn(s, f) {
  if (!f.bizTypes.length && !f.scenarios.length) return true
  if (f.regions.length) {
    for (const r of f.regions) {
      const { biz, scn } = aggregateCn(s, [r])
      if (f.bizTypes.length && !f.bizTypes.every((b) => biz.has(b))) return false
      if (f.scenarios.length && !f.scenarios.every((x) => scn.has(x))) return false
    }
    return true
  }
  const { biz, scn } = aggregateCn(s, null)
  if (f.bizTypes.length && !f.bizTypes.every((b) => biz.has(b))) return false
  if (f.scenarios.length && !f.scenarios.every((x) => scn.has(x))) return false
  return true
}

// 美国维度判定（服务能力，区域逐区 AND）
function judgeUs(s, f) {
  if (!f.abilities.length) return true
  if (f.regions.length) {
    for (const r of f.regions) {
      const union = aggregateAbil(s, [r])
      if (!f.abilities.every((a) => abilitySatisfies(union, a))) return false
    }
    return true
  }
  const union = aggregateAbil(s, null)
  return f.abilities.every((a) => abilitySatisfies(union, a))
}

function matchSupplier(s, view, f) {
  // 通用：名称
  if (f.keyword && !s.name.toLowerCase().includes(f.keyword.trim().toLowerCase())) return false
  // 通用：合作状态（单值）
  if (f.status && s.status !== f.status) return false
  // 通用：覆盖区域（多选 AND；供应商覆盖区域 = 配置组适用区域自动汇总）
  if (f.regions.length && !f.regions.every((r) => regionOverlaps(deriveRegions(s), r))) return false

  if (view.kind === 'cn') return judgeCn(s, f)
  if (view.kind === 'us') return judgeUs(s, f)
  // 资源地图：国内 + 美国两个维度同时生效
  if (view.kind === 'map') return judgeCn(s, f) && judgeUs(s, f)
  return true
}

// 视图可见范围过滤 + 筛选判定
export function filterSuppliers(suppliers, view, filters) {
  const visible = suppliers.filter((s) => {
    if (view.kind === 'cn') {
      if (!(s.pools || []).includes('国内/后段资源盘')) return false
      return true
    }
    if (view.id === 'us-west') return (s.usPool || []).includes('美西')
    if (view.id === 'us-east') return (s.usPool || []).includes('美东')
    return true
  })
  return visible.filter((s) => matchSupplier(s, view, filters))
}
