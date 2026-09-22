<script setup>
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useStore, addAccount, removeAccount, renameAccount, addMember, updateMemberPassword, removeMember, updateAccountPerm, permFieldGroups, getFieldPerms, setFieldPerm } from '../store'
import { views } from '../data/mockAccounts'

const store = useStore()
const viewName = (id) => views.find((v) => v.id === id)?.name || id

// 字段权限矩阵行（劲港 / 美盈两块）
const fieldRows = permFieldGroups.flatMap((g) =>
  g.fields.map((f, i) => ({ ...f, group: g.label, first: i === 0, groupSize: g.fields.length }))
)
const fieldPools = [
  { key: 'cn', label: '劲港资源池' },
  { key: 'us', label: '美盈资源池' },
]
function spanMethod({ row, columnIndex }) {
  if (columnIndex === 0) {
    if (row.first) return { rowspan: row.groupSize, colspan: 1 }
    return { rowspan: 0, colspan: 0 }
  }
  return { rowspan: 1, colspan: 1 }
}
function hasField(poolKey, fieldKey, kind) {
  const perms = getFieldPerms(permModal.accountId)
  return (perms[poolKey][kind] || []).includes(fieldKey)
}

// 新建账号弹窗
const newAccModal = reactive({ visible: false, form: { name: '', views: ['res-map'], memberUsername: '', memberPassword: '' } })
function openNewAccount() {
  newAccModal.form = { name: '', views: ['res-map'], memberUsername: '', memberPassword: '' }
  newAccModal.visible = true
}
function submitNewAccount() {
  const f = newAccModal.form
  if (!f.name.trim()) return ElMessage.warning('请填写账号名称')
  if (!f.views.length) return ElMessage.warning('请至少勾选一个可见视图')
  if (f.memberUsername && !f.memberPassword) return ElMessage.warning('填了成员用户名就必须填密码')
  const r = addAccount(f.name.trim(), f.views, f.memberUsername ? { username: f.memberUsername.trim(), password: f.memberPassword } : null)
  if (r.ok) {
    newAccModal.visible = false
    ElMessage.success(`账号「${f.name.trim()}」已创建`)
  }
}
function delAccount(accountId, name) {
  ElMessageBox.confirm(`删除账号「${name}」后其成员将无法登录，确定删除？`, '删除账号', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      const r = removeAccount(accountId)
      if (r.ok) ElMessage.success('账号已删除')
      else ElMessage.warning(r.msg)
    })
    .catch(() => {})
}

// 账号改名弹窗
const renameModal = reactive({ visible: false, accountId: '', name: '' })
function openRename(accountId, name) {
  renameModal.accountId = accountId
  renameModal.name = name
  renameModal.visible = true
}
function submitRename() {
  const r = renameAccount(renameModal.accountId, renameModal.name)
  if (!r.ok) return ElMessage.warning(r.msg)
  renameModal.visible = false
  ElMessage.success('账号名称已更新')
}

// 成员管理弹窗（新增成员 / 修改密码共用）
const memberModal = reactive({ visible: false, mode: 'add', accountId: '', memberId: '', memberForm: { username: '', password: '' } })
const showPassword = ref({})
function openMembers(accountId) {
  memberModal.accountId = accountId
  memberModal.mode = 'add'
  memberModal.memberId = ''
  memberModal.memberForm = { username: '', password: '' }
  memberModal.visible = true
}
function openChangePwd(accountId, member) {
  memberModal.accountId = accountId
  memberModal.mode = 'editPwd'
  memberModal.memberId = member.id
  memberModal.memberForm = { username: member.username, password: '' }
  memberModal.visible = true
}
const activeAccount = () => store.accounts.find((a) => a.id === memberModal.accountId)
function submitMember() {
  const f = memberModal.memberForm
  if (memberModal.mode === 'editPwd') {
    if (!f.password.trim()) return ElMessage.warning('请输入新密码')
    updateMemberPassword(memberModal.accountId, memberModal.memberId, f.password.trim())
    memberModal.visible = false
    ElMessage.success(`密码已修改为 ${f.password.trim()}`)
    return
  }
  if (!f.username.trim() || !f.password.trim()) return ElMessage.warning('请填写用户名和密码')
  const r = addMember(memberModal.accountId, f.username.trim(), f.password.trim())
  if (!r.ok) return ElMessage.warning(r.msg)
  memberModal.memberForm = { username: '', password: '' }
  ElMessage.success('成员已添加')
}
function delMember(accountId, memberId) {
  ElMessageBox.confirm('删除后该账号将无法登录，确定删除？', '删除账号', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      removeMember(accountId, memberId)
      ElMessage.success('账号已删除')
    })
    .catch(() => {})
}

// 权限编辑弹窗
const permModal = reactive({ visible: false, accountId: '', form: {} })
function openPerm(accountId) {
  const acc = store.accounts.find((a) => a.id === accountId)
  permModal.accountId = accountId
  getFieldPerms(accountId) // 确保字段权限已初始化
  permModal.form = {
    views: [...acc.views],
    canCreate: [...acc.canCreate],
    canExport: acc.canExport,
    canManage: acc.canManage,
  }
  permModal.visible = true
}
function submitPerm() {
  updateAccountPerm(permModal.accountId, {
    views: [...permModal.form.views],
    canCreate: [...permModal.form.canCreate],
    canExport: permModal.form.canExport,
    canManage: permModal.form.canManage,
  })
  ElMessage.success('权限已更新')
  permModal.visible = false
}
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
      <span style="color: #6b7280; font-size: 13px">账号列表：每个账号独立配置可见视图与成员</span>
      <el-button type="primary" size="small" @click="openNewAccount">新建账号</el-button>
    </div>
    <el-table :data="store.accounts" size="small" border>
      <el-table-column prop="name" label="账号" width="140" />
      <el-table-column label="成员" width="90">
        <template #default="{ row }">{{ row.members?.length || 0 }} 人</template>
      </el-table-column>
      <el-table-column label="可见视图" min-width="180">
        <template #default="{ row }">{{ row.views.map(viewName).join('、') }}</template>
      </el-table-column>
      <el-table-column label="新增供应商" width="110">
        <template #default="{ row }">
          {{ [row.canCreate.includes('cn') ? '劲港' : '', row.canCreate.includes('us') ? '美盈' : ''].filter(Boolean).join('、') || '—' }}
        </template>
      </el-table-column>
      <el-table-column label="导出" width="70">
        <template #default="{ row }">{{ row.canExport ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="280">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openMembers(row.id)">管理成员</el-button>
          <el-button link type="primary" size="small" @click="openRename(row.id, row.name)">改名</el-button>
          <el-button v-if="row.id !== 'admin'" link type="primary" size="small" @click="openPerm(row.id)">编辑权限</el-button>
          <el-tooltip v-else content="主账号权限不可修改" placement="top">
            <span><el-button link type="info" size="small" disabled>编辑权限</el-button></span>
          </el-tooltip>
          <el-button v-if="row.id !== 'admin'" link type="danger" size="small" @click="delAccount(row.id, row.name)">删除账号</el-button>
          <el-tooltip v-else content="主账号不可删除" placement="top">
            <span><el-button link type="info" size="small" disabled>删除账号</el-button></span>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新建账号弹窗 -->
    <el-dialog v-model="newAccModal.visible" title="新建账号" width="520px" append-to-body>
      <el-form label-width="90px">
        <el-form-item label="账号名称" required><el-input v-model="newAccModal.form.name" placeholder="如：美西运营" /></el-form-item>
        <el-form-item label="可见视图" required>
          <el-checkbox-group v-model="newAccModal.form.views">
            <el-checkbox v-for="v in views" :key="v.id" :label="v.id">{{ v.name }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="初始成员">
          <div style="display: flex; gap: 8px; width: 100%">
            <el-input v-model="newAccModal.form.memberUsername" placeholder="用户名（可空，稍后添加）" style="flex: 1" />
            <el-input v-model="newAccModal.form.memberPassword" placeholder="密码" style="flex: 1" />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="newAccModal.visible = false">取消</el-button>
        <el-button type="primary" @click="submitNewAccount">创建账号</el-button>
      </template>
    </el-dialog>

    <!-- 账号改名弹窗 -->
    <el-dialog v-model="renameModal.visible" title="账号改名" width="420px" append-to-body>
      <el-form label-width="80px">
        <el-form-item label="账号名称" required><el-input v-model="renameModal.name" placeholder="输入新的账号名称" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="renameModal.visible = false">取消</el-button>
        <el-button type="primary" @click="submitRename">保存</el-button>
      </template>
    </el-dialog>

    <!-- 成员管理弹窗 -->
    <el-dialog v-model="memberModal.visible" :title="memberModal.mode === 'editPwd' ? '修改密码' : `成员管理 · ${activeAccount()?.name || ''}`" width="680px" append-to-body>
      <el-form inline style="margin-bottom: 12px">
        <el-form-item label="用户名">
          <el-input v-model="memberModal.memberForm.username" style="width: 150px" :disabled="memberModal.mode === 'editPwd'" />
        </el-form-item>
        <el-form-item label="密码"><el-input v-model="memberModal.memberForm.password" style="width: 150px" /></el-form-item>
        <el-button v-if="memberModal.mode === 'editPwd'" type="primary" @click="submitMember">保存新密码</el-button>
        <el-button v-else type="primary" @click="submitMember">添加成员</el-button>
      </el-form>
      <el-table :data="activeAccount()?.members || []" size="small" border>
        <el-table-column prop="username" label="用户名" width="140" />
        <el-table-column label="密码" width="160">
          <template #default="{ row }">
            <span>{{ showPassword[row.id] ? row.password : '••••••' }}</span>
            <el-button link size="small" @click="showPassword[row.id] = !showPassword[row.id]">
              {{ showPassword[row.id] ? '隐藏' : '显示' }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="150" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openChangePwd(memberModal.accountId, row)">修改密码</el-button>
            <el-button v-if="memberModal.accountId !== 'admin'" link type="danger" size="small" @click="delMember(memberModal.accountId, row.id)">删除账号</el-button>
            <el-tooltip v-else content="主账号不可删除" placement="top">
              <span><el-button link type="info" size="small" disabled>删除账号</el-button></span>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 权限编辑弹窗 -->
    <el-dialog v-model="permModal.visible" title="编辑账号权限" width="940px" top="4vh" append-to-body>
      <el-form label-width="100px">
        <el-form-item label="可见视图">
          <el-checkbox-group v-model="permModal.form.views">
            <el-checkbox v-for="v in views" :key="v.id" :label="v.id">{{ v.name }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="新增供应商">
          <el-checkbox-group v-model="permModal.form.canCreate">
            <el-checkbox label="cn">劲港资源池</el-checkbox>
            <el-checkbox label="us">美盈资源池</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="导出资源"><el-switch v-model="permModal.form.canExport" /></el-form-item>
        <el-form-item label="管理员"><el-switch v-model="permModal.form.canManage" /></el-form-item>
      </el-form>

      <h4 style="margin: 16px 0 8px">信息开放程度（各资源池字段可见 / 可编辑）</h4>
      <el-table :data="fieldRows" size="small" border :span-method="spanMethod" max-height="62vh">
        <el-table-column prop="group" label="信息模块" width="170" />
        <el-table-column prop="label" label="字段" width="200" />
        <template v-for="p in fieldPools" :key="p.key">
          <el-table-column :label="`${p.label} · 可见`" width="80" align="center">
            <template #default="{ row }">
              <el-checkbox
                :model-value="hasField(p.key, row.key, 'visible')"
                @change="(v) => setFieldPerm(permModal.accountId, p.key, 'visible', row.key, v)"
              />
            </template>
          </el-table-column>
          <el-table-column :label="`${p.label} · 可编辑`" width="80" align="center">
            <template #default="{ row }">
              <el-checkbox
                :model-value="hasField(p.key, row.key, 'editable')"
                :disabled="!hasField(p.key, row.key, 'visible')"
                @change="(v) => setFieldPerm(permModal.accountId, p.key, 'editable', row.key, v)"
              />
            </template>
          </el-table-column>
        </template>
      </el-table>
      <template #footer>
        <el-button @click="permModal.visible = false">取消</el-button>
        <el-button type="primary" @click="submitPerm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
