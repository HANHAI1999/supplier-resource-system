import { reactive, watch } from 'vue'
import { mockSuppliers } from '../data/mockSuppliers'
import { mockExceptions } from '../data/mockExceptions'

// 深拷贝 mock 数据，避免编辑污染源文件（热更新后仍干净）
const clone = (v) => JSON.parse(JSON.stringify(v))

// localStorage 持久化（V1 mock：刷新后保留供应商/异常/审计/权限配置）
const STORAGE_KEY = 'supplier-resource-system-v1'
function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return null
}

// 供应商字段树（权限配置粒度：字段级，按用户提供的字段清单）
export const permFieldGroups = [
  {
    key: 'basic',
    label: '基础信息',
    fields: [
      { key: 'basic.name', label: '供应商名称' },
      { key: 'basic.contract', label: '是否签署合同' },
      { key: 'basic.paymentTerms', label: '供应商账期' },
      { key: 'basic.intro', label: '公司介绍' },
      { key: 'basic.reconPerson', label: '对账人' },
      { key: 'basic.capacity', label: '供应商承接能力' },
      { key: 'basic.status', label: '合作状态' },
    ],
  },
  {
    key: 'internal',
    label: '内部管理',
    fields: [
      { key: 'internal.entity', label: '合作主体' },
      { key: 'internal.contact', label: '内部对接人' },
    ],
  },
  {
    key: 'pool',
    label: '资源盘归属',
    fields: [{ key: 'pool', label: '资源盘归属' }],
  },
  {
    key: 'regions',
    label: '供应商覆盖区域',
    fields: [{ key: 'regions', label: '覆盖区域' }],
  },
  {
    key: 'cnConfig',
    label: '劲港资源配置',
    fields: [
      { key: 'cnConfig.region', label: '适用区域' },
      { key: 'cnConfig.bizTypes', label: '业务类型' },
      { key: 'cnConfig.scenarios', label: '服务场景' },
      { key: 'cnConfig.fbaNote', label: 'FBA 备注' },
      { key: 'cnConfig.fbxNote', label: 'FBX 备注' },
      { key: 'cnConfig.note', label: '配置备注' },
    ],
  },
  {
    key: 'usConfig',
    label: '美盈资源配置',
    fields: [
      { key: 'usConfig.usPool', label: '美国资源池归属' },
      { key: 'usConfig.region', label: '适用区域' },
      { key: 'usConfig.abilities', label: '服务能力' },
      { key: 'usConfig.note', label: '配置备注' },
    ],
  },
  {
    key: 'strength',
    label: '资源实力',
    fields: [
      { key: 'strength.fleet', label: '是否自有车队' },
      { key: 'strength.trucks', label: '车头数量' },
      { key: 'strength.frames', label: '车架数量' },
      { key: 'strength.boxes', label: '车厢数量' },
      { key: 'strength.warehouse', label: '是否自有仓库' },
      { key: 'strength.warehouseList', label: '仓库信息' },
    ],
  },
  {
    key: 'contact',
    label: '对外联系信息',
    fields: [
      { key: 'contact.name', label: '供应商联系人' },
      { key: 'contact.title', label: '职务' },
      { key: 'contact.methods', label: '联系方式' },
      { key: 'contact.note', label: '备注' },
    ],
  },
  {
    key: 'remark',
    label: '备注',
    fields: [
      { key: 'remark', label: '备注' },
      { key: 'evaluation', label: '供应商评价' },
    ],
  },
  {
    key: 'exception',
    label: '异常 / 对接记录',
    fields: [
      { key: 'exception.bizTypes', label: '涉及业务' },
      { key: 'exception.regions', label: '涉及区域' },
      { key: 'exception.refNo', label: '关联单号 / 柜号 / 业务编号' },
      { key: 'exception.time', label: '异常时间' },
      { key: 'exception.desc', label: '异常说明' },
      { key: 'exception.images', label: '聊天 / 邮件 / 现场图片' },
      { key: 'exception.process', label: '处理过程' },
      { key: 'exception.processImages', label: '沟通及处理过程截图' },
      { key: 'exception.result', label: '结果说明' },
      { key: 'exception.resultImages', label: '结果凭证 / 截图' },
      { key: 'exception.status', label: '处理状态' },
    ],
  },
]

const allFieldKeys = permFieldGroups.flatMap((g) => g.fields.map((f) => f.key))

// 各账号 × 资源盘（劲港 / 美盈）的字段可见/可编辑配置（默认全部开放）
function defaultFieldPerm() {
  return { visible: [...allFieldKeys], editable: [...allFieldKeys] }
}
function defaultFieldPerms() {
  return { cn: defaultFieldPerm(), us: defaultFieldPerm() }
}
// 兼容旧版 viewPermissions（按资源盘）迁移为按账号
function migrateFieldPerms(old, accounts) {
  if (!old) return null
  const map = {}
  for (const acc of accounts) {
    map[acc.id] = {
      cn: old.cn || defaultFieldPerm(),
      us: old['us-west'] || old.cn || defaultFieldPerm(),
    }
  }
  return map
}

const persisted = loadPersisted()

// 默认账号（含成员：同一账号可多人共用，共享权限）
function defaultAccounts() {
  return [
    {
      id: 'admin',
      name: '系统管理员',
      title: '系统管理员',
      views: ['res-map', 'cn', 'us-west', 'us-east'],
      canCreate: ['cn', 'us'],
      canExport: true,
      canManage: true,
      members: [{ id: 'm-admin', username: 'admin', password: 'admin123', createdAt: '2026-09-17' }],
    },
    {
      id: 'user',
      name: '业务用户',
      title: '业务用户',
      views: ['res-map', 'cn'],
      canCreate: [],
      canExport: false,
      canManage: false,
      members: [{ id: 'm-user', username: 'user01', password: 'user123', createdAt: '2026-09-17' }],
    },
  ]
}

const state = reactive({
  currentAccountId: persisted?.currentAccountId || 'admin',
  loggedInAccountId: persisted?.loggedInAccountId || '', // 空 = 未登录
  currentViewId: 'res-map', // 默认进入资源地图（不持久化视图，刷新总是回地图）
  accounts: persisted?.accounts || defaultAccounts(),
  fieldPerms: migrateFieldPerms(persisted?.viewPermissions, persisted?.accounts || defaultAccounts()) || persisted?.fieldPerms || defaultFieldPerms(),
  suppliers: persisted?.suppliers || clone(mockSuppliers),
  manualOrder: persisted?.manualOrder || [], // 手动拖拽排序（供应商 id 顺序）
  exceptions: persisted?.exceptions || clone(mockExceptions),
  auditLogs: persisted?.auditLogs || [],
  filters: {
    keyword: '',
    regions: [],
    bizTypes: [],
    scenarios: [],
    abilities: [],
    status: '',
  },
})

// 数据变更自动持久化（筛选条件不持久化，刷新重置）
watch(
  () => [
    state.accounts,
    state.fieldPerms,
    state.suppliers,
    state.exceptions,
    state.auditLogs,
    state.currentAccountId,
  ],
  () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          accounts: state.accounts,
          fieldPerms: state.fieldPerms,
          manualOrder: state.manualOrder,
          suppliers: state.suppliers,
          exceptions: state.exceptions,
          auditLogs: state.auditLogs,
          currentAccountId: state.currentAccountId,
          loggedInAccountId: state.loggedInAccountId,
        })
      )
    } catch {
      /* ignore */
    }
  },
  { deep: true }
)

export function useStore() {
  return state
}

// ---------- 账号管理 ----------
export function addAccount(name, views, member) {
  const acc = {
    id: 'acc-' + Date.now(),
    name: name || '新账号',
    title: name || '新账号',
    views: [...views],
    canCreate: [],
    canExport: false,
    canManage: false,
    members: member && member.username ? [{ id: 'm-' + Date.now(), username: member.username, password: member.password, createdAt: new Date().toLocaleString('zh-CN') }] : [],
  }
  state.accounts.push(acc)
  getFieldPerms(acc.id) // 初始化字段权限
  return { ok: true, account: acc }
}

export function removeAccount(accountId) {
  if (accountId === 'admin') return { ok: false, msg: '主账号不可删除' }
  const idx = state.accounts.findIndex((a) => a.id === accountId)
  if (idx === -1) return { ok: false, msg: '账号不存在' }
  state.accounts.splice(idx, 1)
  delete state.fieldPerms[accountId]
  return { ok: true }
}

export function addMember(accountId, username, password) {
  const acc = state.accounts.find((a) => a.id === accountId)
  if (!acc) return { ok: false, msg: '账号不存在' }
  if (!acc.members) acc.members = []
  if (acc.members.some((x) => x.username === username)) {
    return { ok: false, msg: `用户名 ${username} 已存在，请直接点「修改密码」` }
  }
  acc.members.push({
    id: 'm-' + Date.now(),
    username,
    password,
    createdAt: new Date().toLocaleString('zh-CN'),
  })
  return { ok: true }
}

// 修改密码：按用户名更新该账号下所有同名成员，避免历史数据里重复同名成员导致登录对不上
export function updateMemberPassword(accountId, memberId, password) {
  const acc = state.accounts.find((a) => a.id === accountId)
  if (!acc?.members?.length) return
  const target = acc.members.find((x) => x.id === memberId)
  const name = target?.username
  if (!name) return
  for (const m of acc.members) {
    if (m.username === name) m.password = password
  }
}

export function removeMember(accountId, memberId) {
  if (accountId === 'admin') return // 主账号成员不可删除
  const acc = state.accounts.find((a) => a.id === accountId)
  if (!acc?.members) return
  acc.members = acc.members.filter((x) => x.id !== memberId)
}

export function updateAccountPerm(accountId, patch) {
  if (accountId === 'admin') return // 主账号权限不可修改
  const acc = state.accounts.find((a) => a.id === accountId)
  if (acc) Object.assign(acc, patch)
}

// 当前视图对应的资源盘权限（cn 三个视图共用；美西/美东各一个）
// 当前账号 × 视图对应的字段权限（劲港=cn，美盈=us，美西/美东共用美盈）
export function permOf(account, view) {
  const fallback = defaultFieldPerm()
  if (!account || !view) return fallback
  const perms = state.fieldPerms[account.id]
  if (!perms) return fallback
  if (view.kind === 'cn') return perms.cn || fallback
  if (view.kind === 'us') return perms.us || fallback
  return perms.cn || fallback
}

// 读取/更新账号字段权限（账号管理用）
export function getFieldPerms(accountId) {
  if (!state.fieldPerms[accountId]) {
    state.fieldPerms[accountId] = defaultFieldPerms()
  }
  return state.fieldPerms[accountId]
}
export function setFieldPerm(accountId, poolKey, kind, fieldKey, val) {
  if (accountId === 'admin') return // 主账号字段权限不可修改
  const perms = getFieldPerms(accountId)
  const cur = perms[poolKey][kind]
  perms[poolKey][kind] = val ? [...cur, fieldKey] : cur.filter((k) => k !== fieldKey)
}

// ---------- 登录 ----------
export function login(username, password) {
  const u = (username || '').trim()
  const p = (password || '').trim()
  for (const acc of state.accounts) {
    const m = (acc.members || []).find((x) => x.username === u && String(x.password).trim() === p)
    if (m) {
      state.loggedInAccountId = acc.id
      state.currentAccountId = acc.id
      state.currentViewId = 'res-map'
      return { ok: true, account: acc, member: m }
    }
  }
  return { ok: false }
}

export function logout() {
  state.loggedInAccountId = ''
  state.currentAccountId = state.accounts[0]?.id || 'admin'
  state.currentViewId = 'res-map'
}

// 手动拖拽排序：保存供应商顺序（未手动排序的排在后面）
export function setManualOrder(orderedIds) {
  const known = new Set(state.suppliers.map((s) => s.id))
  const ordered = orderedIds.filter((id) => known.has(id))
  const rest = state.suppliers.map((s) => s.id).filter((id) => !ordered.includes(id))
  state.manualOrder = [...ordered, ...rest]
}
// 按手动排序整理列表
export function applyManualOrder(list) {
  if (!state.manualOrder.length) return list
  const idx = new Map(state.manualOrder.map((id, i) => [id, i]))
  return [...list].sort((a, b) => (idx.get(a.id) ?? Infinity) - (idx.get(b.id) ?? Infinity))
}

export function resetFilters() {
  state.filters.keyword = ''
  state.filters.regions = []
  state.filters.bizTypes = []
  state.filters.scenarios = []
  state.filters.abilities = []
  state.filters.status = ''
}

export function addSupplier(data) {
  state.suppliers.push(data)
}

export function updateSupplier(id, patch) {
  const idx = state.suppliers.findIndex((s) => s.id === id)
  if (idx >= 0) state.suppliers[idx] = { ...state.suppliers[idx], ...patch }
}

export function addException(data) {
  state.exceptions.push(data)
}

export function addAudit(record) {
  state.auditLogs.unshift(record)
}
