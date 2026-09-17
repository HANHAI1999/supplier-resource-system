// Mock 账号与资源视图（统一账号：系统管理员 + 业务用户；国内盘三视图合一为劲港资源池）
export const mockAccounts = [
  {
    id: 'admin',
    name: '系统管理员',
    title: '系统管理员',
    views: ['res-map', 'cn', 'us-west', 'us-east'],
    canCreate: ['cn', 'us'],
    canExport: true,
    canManage: true,
  },
  {
    id: 'user',
    name: '业务用户',
    title: '业务用户',
    views: ['res-map', 'cn'],
    canCreate: [],
    canExport: false,
    canManage: false,
  },
]

// 资源视图定义（资源地图为默认入口）
export const views = [
  { id: 'res-map', name: '资源地图', group: 'map', kind: 'map' },
  { id: 'cn', name: '劲港资源池', group: 'cn', kind: 'cn' },
  { id: 'us-west', name: '美西调度', group: 'us', kind: 'us' },
  { id: 'us-east', name: '美东调度', group: 'us', kind: 'us' },
]
