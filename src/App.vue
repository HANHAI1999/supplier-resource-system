<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useStore, setCloudSuppliers, resetFilters, addSupplier, updateSupplier, addException, addAudit, logout, applyManualOrder, setManualOrder } from './store'
import { fetchCloudSuppliers, isCloudApiConfigured } from './services/suppliersApi'
import { views } from './data/mockAccounts'
import { filterSuppliers } from './utils/filter'
import { exportSuppliersXlsx, pickScope } from './utils/export'
import ResourceNav from './components/ResourceNav.vue'
import FilterBar from './components/FilterBar.vue'
import SupplierTable from './components/SupplierTable.vue'
import SupplierDetail from './components/SupplierDetail.vue'
import NewSupplierModal from './components/NewSupplierModal.vue'
import ResourceMap from './components/ResourceMap.vue'
import AccountManager from './components/AccountManager.vue'
import Login from './components/Login.vue'

const store = useStore()
const suppliers = computed(() => store.cloudSuppliers ?? store.suppliers)

const currentAccount = computed(
  () => store.accounts.find((a) => a.id === store.currentAccountId) || store.accounts[0]
)
const currentView = computed(() => {
  if (store.currentViewId === 'perm') return { id: 'perm', name: '权限管理', group: 'perm', kind: 'perm' }
  return views.find((v) => v.id === store.currentViewId) || views[0]
})
const viewName = (id) => views.find((v) => v.id === id)?.name || id

const filtered = computed(() =>
  currentView.value.id === 'perm'
    ? []
    : applyManualOrder(filterSuppliers(suppliers.value, currentView.value, store.filters))
)

watch(
  () => store.loggedInAccountId,
  async (accountId) => {
    if (!accountId || !isCloudApiConfigured()) return
    try {
      setCloudSuppliers(await fetchCloudSuppliers())
    } catch (error) {
      ElMessage.warning(error.message)
    }
  },
  { immediate: true }
)

function onReorder(ids) {
  setManualOrder(ids)
}

// 切换账号时保证当前视图可见
watch(
  () => store.currentAccountId,
  (id) => {
    const acc = store.accounts.find((a) => a.id === id)
    if (!acc) return
    if (store.currentViewId === 'perm' && acc.canManage) return
    if (!acc.views.includes(store.currentViewId)) store.currentViewId = acc.views[0]
  }
)

// 切换视图时清空不适用该视图的筛选条件（不得带过视图边界）
watch(
  () => store.currentViewId,
  (id) => {
    const v = views.find((x) => x.id === id)
    if (!v) return
    if (v.kind === 'cn') store.filters.abilities = []
    else if (v.kind === 'us') {
      store.filters.bizTypes = []
      store.filters.scenarios = []
    }
  }
)

const canCreateHere = computed(() => currentAccount.value.canCreate.includes(currentView.value.group))
const canExportHere = computed(() => currentAccount.value.canExport && currentView.value.id !== 'perm')

// 供应商详情
const detailVisible = ref(false)
const detailSupplierId = ref('')
const detailSupplier = computed(() => suppliers.value.find((s) => s.id === detailSupplierId.value) || null)
function openDetail(row) {
  detailSupplierId.value = row.id
  detailVisible.value = true
}
function onSaveSupplier(patch) {
  updateSupplier(detailSupplierId.value, patch)
  ElMessage.success('已保存')
}
function onAddException(data) {
  addException({ id: 'EX-' + Date.now(), ...data })
  ElMessage.success('异常记录已添加')
}

// 新增供应商
const createVisible = ref(false)
function openCreate() {
  createVisible.value = true
}
function onCreateSupplier(data) {
  addSupplier({
    id: 'SUP-NEW-' + Date.now(),
    ...data,
    createdBy: currentAccount.value.name,
    createdAt: new Date().toLocaleString('zh-CN'),
  })
  ElMessage.success('供应商已创建')
  createVisible.value = false
}

// 导出
const exportVisible = ref(false)
const exportForm = reactive({ scope: 'view', includeExceptions: false })
const exportScopes = [
  { value: 'all', label: '全部供应商资源' },
  { value: 'cn', label: '劲港资源池' },
  { value: 'us', label: '美盈资源池' },
  { value: 'view', label: '当前资源视图' },
  { value: 'filtered', label: '当前筛选结果' },
]
const scopeLabel = (v) => exportScopes.find((x) => x.value === v)?.label || v
function openExport() {
  exportVisible.value = true
}
function doExport() {
  const list = pickScope(suppliers.value, exportForm.scope, currentView.value, filtered.value)
  if (!list.length) {
    ElMessage.warning('该范围内没有可导出的供应商')
    return
  }
  exportSuppliersXlsx(list, store.exceptions, exportForm.includeExceptions, scopeLabel(exportForm.scope))
  addAudit({
    operator: currentAccount.value.name,
    time: new Date().toLocaleString('zh-CN'),
    scope: scopeLabel(exportForm.scope),
    count: list.length,
    includeExceptions: exportForm.includeExceptions,
  })
  ElMessage.success(`已导出 ${list.length} 家供应商`)
  exportVisible.value = false
}
</script>

<template>
  <Login v-if="!store.loggedInAccountId" @logged-in="() => {}" />
  <div v-else class="app-shell">
    <aside class="side-nav">
      <div class="logo">联宇资源池</div>
      <ResourceNav
        :current-account-id="store.currentAccountId"
        :current-view-id="store.currentViewId"
        @select-view="(v) => (store.currentViewId = v)"
      />
    </aside>

    <div class="main">
      <header class="top-bar">
        <div class="view-title">{{ currentView.name }}</div>
        <div style="display: flex; align-items: center; gap: 10px">
          <span style="color: #6b7280; font-size: 13px">{{ currentAccount.name }} · {{ currentAccount.title }}</span>
          <el-button link type="primary" size="small" @click="logout">退出登录</el-button>
        </div>
      </header>

      <main class="content">
        <template v-if="currentView.id !== 'perm'">
          <template v-if="currentView.id === 'res-map'">
            <div class="toolbar">
              <el-button v-if="canExportHere" @click="openExport">导出资源</el-button>
            </div>
            <ResourceMap :suppliers="suppliers" @open="openDetail" />
          </template>
          <template v-else>
            <div class="toolbar">
              <el-button v-if="canCreateHere" type="primary" @click="openCreate">+ 新增供应商</el-button>
              <el-button v-if="canExportHere" @click="openExport">导出资源</el-button>
            </div>
            <FilterBar :view="currentView" :filters="store.filters" @reset="resetFilters" />
            <SupplierTable :suppliers="filtered" :can-sort="!!currentAccount?.canManage" @open="openDetail" @reorder="onReorder" />
          </template>
        </template>

        <div v-else class="table-card">
          <h3 style="margin-top: 0">权限管理</h3>
          <h4 style="margin: 0 0 10px">账号管理（含信息开放程度）</h4>
          <AccountManager />

          <h4 style="margin: 20px 0 10px">导出审计记录</h4>
          <el-table :data="store.auditLogs" size="small">
            <el-table-column prop="operator" label="导出人" width="130" />
            <el-table-column prop="time" label="导出时间" width="190" />
            <el-table-column prop="scope" label="导出范围" min-width="180" />
            <el-table-column prop="count" label="导出数量" width="100" />
            <el-table-column label="含异常记录" width="110">
              <template #default="{ row }">{{ row.includeExceptions ? '是' : '否' }}</template>
            </el-table-column>
          </el-table>
          <p v-if="!store.auditLogs.length" style="color: #9ca3af">暂无审计记录</p>
        </div>
      </main>
    </div>

    <SupplierDetail
      v-model:visible="detailVisible"
      :supplier="detailSupplier"
      :view="currentView"
      :account="currentAccount"
      :exceptions="store.exceptions"
      @save="onSaveSupplier"
      @add-exception="onAddException"
    />

    <!-- 新增供应商（两步式 Drawer） -->
    <NewSupplierModal
      v-model:visible="createVisible"
      :account-name="currentAccount.name"
      @create="onCreateSupplier"
    />

    <!-- 导出资源 -->
    <el-dialog v-model="exportVisible" title="导出资源" width="480px">
      <el-form label-width="110px">
        <el-form-item label="导出范围" required>
          <el-radio-group v-model="exportForm.scope">
            <el-radio v-for="sc in exportScopes" :key="sc.value" :label="sc.value">{{ sc.label }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="导出内容">
          <el-checkbox v-model="exportForm.includeExceptions">包含异常 / 对接记录</el-checkbox>
          <div style="color: #9ca3af; font-size: 12px">默认导出供应商完整信息（XLSX）</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="exportVisible = false">取消</el-button>
        <el-button type="primary" @click="doExport">导出</el-button>
      </template>
    </el-dialog>
  </div>
</template>
