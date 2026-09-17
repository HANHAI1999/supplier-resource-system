<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { regionForest } from '../data/regions'
import { serviceAbilityTree } from '../data/serviceAbilities'
import { flattenForest, collectLabels, deriveRegions } from '../utils/options'
import { permOf, permFieldGroups } from '../store'
import TreeSelectPop from './TreeSelectPop.vue'
import TreeSelectSingle from './TreeSelectSingle.vue'

const props = defineProps({
  visible: Boolean,
  supplier: Object,
  view: Object,
  account: Object,
  exceptions: Array,
})
const emit = defineEmits(['update:visible', 'save', 'add-exception'])

const s = computed(() => props.supplier || {})

// 编辑权限：管理员可编辑全部资源盘；普通账号当前为只读
const canEdit = computed(() => {
  if (!props.account || !props.view) return false
  if (props.account.canManage) return true
  return props.account.canCreate.includes(props.view.group)
})

// 当前账号 × 视图的字段级可见/可编辑配置（管理员在权限管理里调整）
const perm = computed(() => permOf(props.account, props.view))
function canSeeField(key) {
  return (perm.value.visible || []).includes(key)
}
function canEditField(key) {
  return canEdit.value && (perm.value.editable || []).includes(key)
}
function groupVisible(groupKey) {
  const g = permFieldGroups.find((x) => x.key === groupKey)
  return !!g && g.fields.some((f) => canSeeField(f.key))
}
function groupEditable(groupKey) {
  const g = permFieldGroups.find((x) => x.key === groupKey)
  return !!g && canEdit.value && g.fields.some((f) => canEditField(f.key))
}

const regionLabel = collectLabels(regionForest)
const abilityLabel = collectLabels(serviceAbilityTree)
const regionName = (v) => regionLabel[v] || v
const abilityName = (v) => abilityLabel[v] || v
const regionOptions = flattenForest(regionForest)
const abilityOptions = flattenForest(serviceAbilityTree)
// 资源池显示名（内部 key 不变）
const poolName = (v) =>
  ({ '国内/后段资源盘': '劲港资源池', '美国供应商资源池': '美盈资源池' }[v] || v)
// 覆盖区域 = 配置组适用区域自动汇总（不再手动维护）
const derivedRegions = computed(() => deriveRegions(s.value))

// 内部对接人兼容字符串/数组
function contactList(v) {
  return Array.isArray(v) ? v : v ? [v] : []
}

// ---------- 编辑 ----------
const editMode = ref(false)
const form = reactive({})
function startEdit() {
  const sup = s.value
  Object.assign(form, {
    name: sup.name,
    contract: sup.contract,
    paymentTerms: sup.paymentTerms,
    intro: sup.intro,
    country: sup.country,
    status: sup.status,
    entity: sup.entity,
    internalContact: [...contactList(sup.internalContact)],
    pools: [...(sup.pools || [])],
    cnConfigs: (sup.cnConfigs || []).map((c) => ({
      ...c,
      bizTypes: [...(c.bizTypes || [])],
      scenarios: [...(c.scenarios || [])],
      note: c.note || '',
    })),
    abilityConfigs: (sup.abilityConfigs || []).map((c) => ({ ...c, abilities: [...(c.abilities || [])], note: c.note || '' })),
    usPool: [...(sup.usPool || [])],
    fleetHas: sup.fleet?.has || false,
    trucks: sup.fleet?.trucks || 0,
    frames: sup.fleet?.frames || 0,
    boxes: sup.fleet?.boxes || 0,
    whHas: sup.warehouse?.has || false,
    warehouseList: (sup.warehouse?.list || []).map((w) => ({ ...w })),
    contacts: (sup.contacts || []).map((c) => ({ ...c })),
    remark: sup.remark || '',
  })
  editMode.value = true
}
function save() {
  const cnConfigs = form.cnConfigs.map((c) => ({
    ...c,
    bizTypes: [...c.bizTypes],
    scenarios: [...c.scenarios],
    note: c.note || '',
  }))
  const abilityConfigs = form.abilityConfigs.map((c) => ({ ...c, abilities: [...c.abilities], note: c.note || '' }))
  emit('save', {
    name: form.name,
    contract: form.contract,
    paymentTerms: form.paymentTerms,
    intro: form.intro,
    country: form.country,
    status: form.status,
    entity: form.entity,
    internalContact: [...form.internalContact],
    pools: [...form.pools],
    regions: deriveRegions({ cnConfigs, abilityConfigs }),
    cnConfigs,
    abilityConfigs,
    usPool: [...form.usPool],
    fleet: {
      has: form.fleetHas,
      trucks: form.fleetHas ? Number(form.trucks) || 0 : 0,
      frames: form.fleetHas ? Number(form.frames) || 0 : 0,
      boxes: form.fleetHas ? Number(form.boxes) || 0 : 0,
    },
    warehouse: { has: form.whHas, list: form.whHas ? form.warehouseList.map((w) => ({ ...w })) : [] },
    contacts: form.contacts.map((c) => ({ ...c })),
    remark: form.remark,
  })
  editMode.value = false
}
function cancel() {
  editMode.value = false
}

// 配置组弹窗（国内区域业务组 / 美国区域能力组）
const cfgModal = reactive({ visible: false, type: 'cn', index: -1, data: {} })
function openCfg(type, index = -1) {
  cfgModal.type = type
  cfgModal.index = index
  cfgModal.data =
    index >= 0
      ? JSON.parse(JSON.stringify(type === 'cn' ? form.cnConfigs[index] : form.abilityConfigs[index]))
      : type === 'cn'
        ? { region: '', bizTypes: [], scenarios: [], fbaNote: '', fbxNote: '', note: '' }
        : { region: '', abilities: [], note: '' }
  cfgModal.visible = true
}
function saveCfg() {
  const d = cfgModal.data
  if (!d.region) {
    ElMessage.warning('请选择区域')
    return
  }
  if (cfgModal.type === 'cn') {
    if (!d.bizTypes.length && !d.scenarios.length) {
      ElMessage.warning('至少选择一项业务类型或服务场景')
      return
    }
    const item = {
      region: d.region,
      bizTypes: [...d.bizTypes],
      scenarios: [...d.scenarios],
      fbaNote: d.fbaNote || '',
      fbxNote: d.fbxNote || '',
      note: d.note || '',
    }
    if (cfgModal.index >= 0) form.cnConfigs[cfgModal.index] = item
    else form.cnConfigs.push(item)
  } else {
    if (!d.abilities.length) {
      ElMessage.warning('至少选择一项服务能力')
      return
    }
    const item = { region: d.region, abilities: [...d.abilities], note: d.note || '' }
    if (cfgModal.index >= 0) form.abilityConfigs[cfgModal.index] = item
    else form.abilityConfigs.push(item)
  }
  cfgModal.visible = false
}

// 联系人弹窗
const contactModal = reactive({ visible: false, index: -1, data: {} })
function openContact(index = -1) {
  contactModal.index = index
  contactModal.data = index >= 0 ? { ...form.contacts[index] } : { name: '', title: '', methods: '', note: '' }
  contactModal.visible = true
}
function saveContact() {
  if (!contactModal.data.name.trim()) {
    ElMessage.warning('请填写联系人姓名')
    return
  }
  const item = { ...contactModal.data }
  if (contactModal.index >= 0) form.contacts[contactModal.index] = item
  else form.contacts.push(item)
  contactModal.visible = false
}

// 仓库弹窗
const whModal = reactive({ visible: false, index: -1, data: {} })
function openWh(index = -1) {
  whModal.index = index
  whModal.data = index >= 0 ? { ...form.warehouseList[index] } : { city: '', address: '', area: '' }
  whModal.visible = true
}
function saveWh() {
  if (!whModal.data.city) {
    ElMessage.warning('请选择仓库所在城市')
    return
  }
  const item = { ...whModal.data }
  if (whModal.index >= 0) form.warehouseList[whModal.index] = item
  else form.warehouseList.push(item)
  whModal.visible = false
}

// 非必填字段整列无值则隐藏列
const cnColHas = (key) => (s.value.cnConfigs || []).some((c) => c[key])
const usColHasNote = computed(() => (s.value.abilityConfigs || []).some((c) => c.note))
const contactColHas = (key) => (s.value.contacts || []).some((c) => c[key])

// ---------- 异常记录 ----------
const exVisible = ref(false)
const exForm = reactive({ desc: '', status: '待处理', bizTypes: [], scenarios: [], regions: [], refNo: '', images: [] })

// 支持直接粘贴图片（不限数量）
function onPaste(e) {
  if (!exVisible.value) return
  const items = e.clipboardData?.items || []
  for (const it of items) {
    if (it.type && it.type.startsWith('image/')) {
      const file = it.getAsFile()
      if (file) exForm.images.push({ name: `粘贴图片${Date.now()}.png`, url: URL.createObjectURL(file) })
    }
  }
}
onMounted(() => window.addEventListener('paste', onPaste))
onUnmounted(() => window.removeEventListener('paste', onPaste))

function submitEx() {
  if (!exForm.desc.trim()) return
  emit('add-exception', {
    supplierId: s.value.id,
    desc: exForm.desc,
    status: exForm.status,
    bizTypes: [...exForm.bizTypes],
    scenarios: [...exForm.scenarios],
    regions: [...exForm.regions],
    refNo: exForm.refNo,
    images: exForm.images.map((f) => f.name || f),
  })
  exVisible.value = false
  Object.assign(exForm, { desc: '', status: '待处理', bizTypes: [], scenarios: [], regions: [], refNo: '', images: [] })
}

// 兼容旧数据：业务类型(整柜/散货)与服务场景(FBA/FBX)分开显示
const exBiz = (e) => (e.bizTypes || []).filter((b) => ['整柜', '散货'].includes(b))
const exScn = (e) => (e.scenarios && e.scenarios.length ? e.scenarios : (e.bizTypes || []).filter((b) => ['FBA', 'FBX'].includes(b)))

const myExceptions = computed(() => (props.exceptions || []).filter((e) => e.supplierId === s.value.id))
const exStatusTag = { 待处理: 'danger', 处理中: 'warning', 已解决: 'success', 暂无法解决: 'info' }

watch(
  () => props.supplier,
  () => {
    editMode.value = false
  }
)
</script>

<template>
  <el-drawer :model-value="visible" size="62%" @close="emit('update:visible', false)">
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
        <span style="font-weight: 600">{{ s.name || '供应商详情' }}</span>
        <span>
          <el-button v-if="canEdit && !editMode" type="primary" size="small" @click="startEdit">编辑</el-button>
          <el-button v-if="canEdit && canSeeField('exception.desc')" size="small" @click="exVisible = true">+ 异常记录</el-button>
        </span>
      </div>
    </template>

    <!-- ==================== 编辑态 ==================== -->
    <template v-if="editMode">
      <!-- 基础信息 -->
      <div class="detail-section" v-if="groupVisible('basic')">
        <h4>基础信息</h4>
        <el-form label-width="110px" style="max-width: 700px">
          <el-form-item v-if="canEditField('basic.name')" label="供应商名称" required><el-input v-model="form.name" /></el-form-item>
          <el-form-item v-else-if="canSeeField('basic.name')" label="供应商名称"><span>{{ form.name }}</span></el-form-item>

          <el-form-item v-if="canEditField('basic.contract')" label="是否签署合同">
            <el-radio-group v-model="form.contract">
              <el-radio label="是">是</el-radio>
              <el-radio label="否">否</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-else-if="canSeeField('basic.contract')" label="是否签署合同"><span>{{ form.contract }}</span></el-form-item>

          <el-form-item v-if="canEditField('basic.paymentTerms')" label="供应商账期">
            <el-select v-model="form.paymentTerms" style="width: 100%">
              <el-option v-for="p in ['月结', '半月结', '周结']" :key="p" :label="p" :value="p" />
            </el-select>
          </el-form-item>
          <el-form-item v-else-if="canSeeField('basic.paymentTerms')" label="供应商账期"><span>{{ form.paymentTerms }}</span></el-form-item>

          <el-form-item v-if="canEditField('basic.country')" label="国家" required><el-input v-model="form.country" /></el-form-item>
          <el-form-item v-else-if="canSeeField('basic.country')" label="国家"><span>{{ form.country }}</span></el-form-item>

          <el-form-item v-if="canEditField('basic.status')" label="合作状态">
            <el-select v-model="form.status" style="width: 100%">
              <el-option v-for="st in ['使用中', '储备', '暂停合作', '已淘汰']" :key="st" :label="st" :value="st" />
            </el-select>
          </el-form-item>
          <el-form-item v-else-if="canSeeField('basic.status')" label="合作状态"><span>{{ form.status }}</span></el-form-item>

          <el-form-item v-if="canEditField('basic.intro')" label="公司介绍">
            <el-input v-model="form.intro" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item v-else-if="canSeeField('basic.intro') && form.intro" label="公司介绍"><span>{{ form.intro }}</span></el-form-item>

          <el-form-item v-if="canEditField('internal.entity')" label="合作主体">
            <el-select v-model="form.entity" style="width: 100%">
              <el-option v-for="e in ['劲港', '美盈', '劲港和美盈']" :key="e" :label="e" :value="e" />
            </el-select>
          </el-form-item>
          <el-form-item v-else-if="canSeeField('internal.entity')" label="合作主体"><span>{{ form.entity }}</span></el-form-item>

          <el-form-item v-if="canEditField('internal.contact')" label="内部对接人">
            <el-select v-model="form.internalContact" multiple clearable style="width: 100%">
              <el-option v-for="c in ['Haven', 'Jay', 'Ryan']" :key="c" :label="c" :value="c" />
            </el-select>
          </el-form-item>
          <el-form-item v-else-if="canSeeField('internal.contact')" label="内部对接人"><span>{{ form.internalContact.join('、') || '—' }}</span></el-form-item>
        </el-form>
      </div>

      <!-- 资源盘归属 -->
      <div class="detail-section" v-if="canSeeField('pool')">
        <h4>资源盘归属</h4>
        <el-checkbox-group v-if="canEditField('pool')" v-model="form.pools">
          <el-checkbox label="国内/后段资源盘">劲港资源池</el-checkbox>
          <el-checkbox label="美盈资源池">美盈资源池</el-checkbox>
        </el-checkbox-group>
        <span v-else>{{ form.pools.join('、') || '—' }}</span>
      </div>

      <!-- 供应商覆盖区域 -->
      <div class="detail-section" v-if="canSeeField('regions')">
        <h4>供应商覆盖区域</h4>
        <div class="v">
          <el-tag v-for="r in derivedRegions" :key="r" size="small" style="margin: 2px 4px 2px 0">{{ regionName(r) }}</el-tag>
          <span v-if="!derivedRegions.length" style="color: #9ca3af">—</span>
        </div>
        <div style="color: #9ca3af; font-size: 12px; margin-top: 4px">由国内 / 美国配置组的适用区域自动汇总</div>
      </div>

      <!-- 劲港资源配置 -->
      <div class="detail-section" v-if="view.kind === 'cn' && groupVisible('cnConfig')">
        <h4>劲港资源配置</h4>
        <template v-if="groupEditable('cnConfig')">
          <div class="edit-subtitle">
            区域业务配置组
            <el-button size="small" type="primary" plain @click="openCfg('cn')">+ 添加配置组</el-button>
          </div>
          <el-table :data="form.cnConfigs" size="small" border>
            <el-table-column v-if="canSeeField('cnConfig.region')" label="适用区域" width="150"><template #default="{ row }">{{ regionName(row.region) }}</template></el-table-column>
            <el-table-column v-if="canSeeField('cnConfig.bizTypes')" label="业务类型"><template #default="{ row }">{{ row.bizTypes.join('、') || '' }}</template></el-table-column>
            <el-table-column v-if="canSeeField('cnConfig.scenarios')" label="服务场景"><template #default="{ row }">{{ row.scenarios.join('、') || '' }}</template></el-table-column>
            <el-table-column v-if="canSeeField('cnConfig.fbaNote')" label="FBA 备注"><template #default="{ row }">{{ row.fbaNote || '' }}</template></el-table-column>
            <el-table-column v-if="canSeeField('cnConfig.fbxNote')" label="FBX 备注"><template #default="{ row }">{{ row.fbxNote || '' }}</template></el-table-column>
            <el-table-column v-if="canSeeField('cnConfig.note')" label="配置备注"><template #default="{ row }">{{ row.note || '' }}</template></el-table-column>
            <el-table-column label="操作" width="130">
              <template #default="{ $index }">
                <el-button link type="primary" size="small" @click="openCfg('cn', $index)">编辑</el-button>
                <el-button link type="danger" size="small" @click="form.cnConfigs.splice($index, 1)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>
        <el-alert v-else title="国内资源配置当前只读" type="info" :closable="false" />
      </div>

      <!-- 美盈资源配置 -->
      <div class="detail-section" v-if="view.kind === 'us' && groupVisible('usConfig')">
        <h4>美盈资源配置</h4>
        <div class="edit-row" v-if="canSeeField('usConfig.usPool')">
          <span class="edit-label">美国资源池归属</span>
          <el-checkbox-group v-if="canEditField('usConfig.usPool')" v-model="form.usPool">
            <el-checkbox label="美西">美西</el-checkbox>
            <el-checkbox label="美东">美东</el-checkbox>
          </el-checkbox-group>
          <span v-else>{{ form.usPool.join('、') || '—' }}</span>
        </div>
        <template v-if="groupEditable('usConfig')">
          <div class="edit-subtitle">
            区域能力配置组
            <el-button size="small" type="primary" plain @click="openCfg('us')">+ 添加配置组</el-button>
          </div>
          <el-table :data="form.abilityConfigs" size="small" border>
            <el-table-column v-if="canSeeField('usConfig.region')" label="适用区域" width="150"><template #default="{ row }">{{ regionName(row.region) }}</template></el-table-column>
            <el-table-column v-if="canSeeField('usConfig.abilities')" label="服务能力"><template #default="{ row }">{{ row.abilities.map(abilityName).join('、') || '' }}</template></el-table-column>
            <el-table-column v-if="canSeeField('usConfig.note')" label="配置备注"><template #default="{ row }">{{ row.note || '' }}</template></el-table-column>
            <el-table-column label="操作" width="130">
              <template #default="{ $index }">
                <el-button link type="primary" size="small" @click="openCfg('us', $index)">编辑</el-button>
                <el-button link type="danger" size="small" @click="form.abilityConfigs.splice($index, 1)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>
        <el-alert v-else title="美国资源配置当前只读" type="info" :closable="false" />
      </div>

      <!-- 资源实力 -->
      <div class="detail-section" v-if="groupVisible('strength')">
        <h4>资源实力</h4>
        <div class="edit-row" v-if="canSeeField('strength.fleet')">
          <span class="edit-label">是否自有车队</span>
          <el-switch v-if="canEditField('strength.fleet')" v-model="form.fleetHas" />
          <span v-else>{{ form.fleetHas ? '是' : '否' }}</span>
          <template v-if="form.fleetHas">
            <template v-if="canEditField('strength.trucks')"><el-input-number v-model="form.trucks" :min="0" size="small" /> 车头</template>
            <span v-else-if="canSeeField('strength.trucks')">车头 {{ form.trucks }}</span>
            <template v-if="canEditField('strength.frames')"><el-input-number v-model="form.frames" :min="0" size="small" /> 车架</template>
            <span v-else-if="canSeeField('strength.frames')">车架 {{ form.frames }}</span>
            <template v-if="canEditField('strength.boxes')"><el-input-number v-model="form.boxes" :min="0" size="small" /> 车厢</template>
            <span v-else-if="canSeeField('strength.boxes')">车厢 {{ form.boxes }}</span>
          </template>
        </div>
        <div class="edit-row" v-if="canSeeField('strength.warehouse')">
          <span class="edit-label">是否自有仓库</span>
          <el-switch v-if="canEditField('strength.warehouse')" v-model="form.whHas" />
          <span v-else>{{ form.whHas ? '是' : '否' }}</span>
          <el-button v-if="form.whHas && canEditField('strength.warehouseList')" size="small" type="primary" plain @click="openWh()">+ 添加仓库</el-button>
        </div>
        <el-table v-if="form.whHas && canSeeField('strength.warehouseList')" :data="form.warehouseList" size="small" border style="margin-top: 8px">
          <el-table-column label="仓库所在城市" min-width="140"><template #default="{ row }">{{ regionName(row.city || row.name) }}</template></el-table-column>
          <el-table-column prop="address" label="地址" min-width="180" />
          <el-table-column prop="area" label="仓库面积" width="110" />
          <el-table-column v-if="canEditField('strength.warehouseList')" label="操作" width="130">
            <template #default="{ $index }">
              <el-button link type="primary" size="small" @click="openWh($index)">编辑</el-button>
              <el-button link type="danger" size="small" @click="form.warehouseList.splice($index, 1)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 对外联系信息 -->
      <div class="detail-section" v-if="groupVisible('contact')">
        <h4>对外联系信息</h4>
        <template v-if="groupEditable('contact')">
          <div class="edit-subtitle">
            联系人
            <el-button size="small" type="primary" plain @click="openContact()">+ 添加联系人</el-button>
          </div>
          <el-table :data="form.contacts" size="small" border>
            <el-table-column v-if="canSeeField('contact.name')" prop="name" label="供应商联系人" width="130" />
            <el-table-column v-if="canSeeField('contact.title')" label="职务" width="130"><template #default="{ row }">{{ row.title || '' }}</template></el-table-column>
            <el-table-column v-if="canSeeField('contact.methods')" prop="methods" label="联系方式" min-width="140" />
            <el-table-column v-if="canSeeField('contact.note')" label="备注" min-width="140"><template #default="{ row }">{{ row.note || '' }}</template></el-table-column>
            <el-table-column label="操作" width="130">
              <template #default="{ $index }">
                <el-button link type="primary" size="small" @click="openContact($index)">编辑</el-button>
                <el-button link type="danger" size="small" @click="form.contacts.splice($index, 1)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>
        <el-alert v-else title="对外联系信息当前只读" type="info" :closable="false" />
      </div>

      <!-- 补充信息 -->
      <div class="detail-section" v-if="canSeeField('remark') && (canEditField('remark') || form.remark)">
        <h4>补充信息</h4>
        <el-input v-if="canEditField('remark')" v-model="form.remark" type="textarea" :rows="2" style="max-width: 560px" placeholder="备注" />
        <span v-else>{{ form.remark }}</span>
      </div>

      <div style="margin-top: 12px">
        <el-button type="primary" @click="save">保存</el-button>
        <el-button @click="cancel">取消</el-button>
      </div>
    </template>

    <!-- ==================== 只读态 ==================== -->
    <template v-else>
      <div class="detail-section" v-if="groupVisible('basic')">
        <h4>基础信息</h4>
        <div class="detail-grid">
          <div v-if="canSeeField('basic.name')" class="detail-item"><div class="k">供应商名称</div><div class="v">{{ s.name }}</div></div>
          <div v-if="canSeeField('basic.status')" class="detail-item"><div class="k">合作状态</div><div class="v">{{ s.status }}</div></div>
          <div v-if="canSeeField('basic.contract')" class="detail-item"><div class="k">是否签署合同</div><div class="v">{{ s.contract }}</div></div>
          <div v-if="canSeeField('basic.paymentTerms')" class="detail-item"><div class="k">供应商账期</div><div class="v">{{ s.paymentTerms }}</div></div>
          <div v-if="canSeeField('basic.country')" class="detail-item"><div class="k">国家</div><div class="v">{{ s.country }}</div></div>
        </div>
        <div v-if="canSeeField('basic.intro') && s.intro" class="detail-item" style="margin-top: 8px">
          <div class="k">公司介绍</div>
          <div class="v">{{ s.intro }}</div>
        </div>
      </div>

      <div class="detail-section" v-if="groupVisible('internal')">
        <h4>内部管理</h4>
        <div class="detail-grid">
          <div v-if="canSeeField('internal.entity')" class="detail-item"><div class="k">合作主体</div><div class="v">{{ s.entity }}</div></div>
          <div v-if="canSeeField('internal.contact')" class="detail-item"><div class="k">内部对接人</div><div class="v">{{ contactList(s.internalContact).join('、') || '—' }}</div></div>
        </div>
      </div>

      <div class="detail-section" v-if="canSeeField('pool')">
        <h4>资源盘归属</h4>
        <div class="v">
          <el-tag v-for="p in s.pools" :key="p" size="small" style="margin-right: 4px">{{ poolName(p) }}</el-tag>
          <span v-if="!s.pools || !s.pools.length" style="color: #9ca3af">—</span>
        </div>
      </div>

      <div class="detail-section" v-if="canSeeField('regions')">
        <h4>供应商覆盖区域</h4>
        <div class="v">
          <el-tag v-for="r in derivedRegions" :key="r" size="small" style="margin: 2px 4px 2px 0">{{ regionName(r) }}</el-tag>
          <span v-if="!derivedRegions.length" style="color: #9ca3af">—</span>
        </div>
        <div style="color: #9ca3af; font-size: 12px; margin-top: 4px">由国内 / 美国配置组的适用区域自动汇总</div>
      </div>

      <div class="detail-section" v-if="view.kind === 'cn' && groupVisible('cnConfig')">
        <h4>劲港资源配置</h4>
        <el-table v-if="s.cnConfigs && s.cnConfigs.length" :data="s.cnConfigs" size="small" border>
          <el-table-column v-if="canSeeField('cnConfig.region')" label="适用区域" width="140"><template #default="{ row }">{{ regionName(row.region) }}</template></el-table-column>
          <el-table-column v-if="canSeeField('cnConfig.bizTypes')" label="业务类型"><template #default="{ row }">{{ row.bizTypes.join('、') || '' }}</template></el-table-column>
          <el-table-column v-if="canSeeField('cnConfig.scenarios')" label="服务场景"><template #default="{ row }">{{ row.scenarios.join('、') || '' }}</template></el-table-column>
          <el-table-column v-if="canSeeField('cnConfig.fbaNote') && cnColHas('fbaNote')" label="FBA 备注"><template #default="{ row }">{{ row.fbaNote || '' }}</template></el-table-column>
          <el-table-column v-if="canSeeField('cnConfig.fbxNote') && cnColHas('fbxNote')" label="FBX 备注"><template #default="{ row }">{{ row.fbxNote || '' }}</template></el-table-column>
          <el-table-column v-if="canSeeField('cnConfig.note') && cnColHas('note')" label="配置备注"><template #default="{ row }">{{ row.note || '' }}</template></el-table-column>
        </el-table>
        <p v-else style="color: #9ca3af">暂无配置</p>
      </div>

      <div class="detail-section" v-if="view.kind === 'us' && groupVisible('usConfig')">
        <h4>美盈资源配置</h4>
        <div class="detail-item" style="margin-bottom: 8px" v-if="canSeeField('usConfig.usPool')">
          <div class="k">美国资源池归属</div>
          <div class="v">
            <el-tag v-for="p in s.usPool" :key="p" size="small" style="margin-right: 4px">{{ p }}</el-tag>
            <span v-if="!s.usPool || !s.usPool.length" style="color: #9ca3af">—</span>
          </div>
        </div>
        <el-table v-if="s.abilityConfigs && s.abilityConfigs.length" :data="s.abilityConfigs" size="small" border>
          <el-table-column v-if="canSeeField('usConfig.region')" label="适用区域" width="140"><template #default="{ row }">{{ regionName(row.region) }}</template></el-table-column>
          <el-table-column v-if="canSeeField('usConfig.abilities')" label="服务能力"><template #default="{ row }">{{ row.abilities.map(abilityName).join('、') || '' }}</template></el-table-column>
          <el-table-column v-if="canSeeField('usConfig.note') && usColHasNote" label="配置备注"><template #default="{ row }">{{ row.note || '' }}</template></el-table-column>
        </el-table>
        <p v-else style="color: #9ca3af">暂无配置</p>
      </div>

      <div class="detail-section" v-if="groupVisible('strength')">
        <h4>资源实力</h4>
        <div class="detail-item" style="margin-bottom: 6px" v-if="canSeeField('strength.fleet')">
          <div class="k">是否自有车队</div>
          <div class="v">
            <template v-if="s.fleet && s.fleet.has">
              是
              <span v-if="canSeeField('strength.trucks')">（车头 {{ s.fleet.trucks }}</span>
              <span v-if="canSeeField('strength.frames')"> / 车架 {{ s.fleet.frames }}</span>
              <span v-if="canSeeField('strength.boxes')"> / 车厢 {{ s.fleet.boxes }}</span>
              <span>）</span>
            </template>
            <span v-else>否</span>
          </div>
        </div>
        <div class="detail-item" v-if="canSeeField('strength.warehouse')">
          <div class="k">是否自有仓库</div>
          <div class="v">
            <template v-if="s.warehouse && s.warehouse.has && canSeeField('strength.warehouseList')">
              <div v-for="(w, i) in s.warehouse.list" :key="i" style="margin-bottom: 2px">
                {{ regionName(w.city || w.name) }}<template v-if="w.address">（{{ w.address }}<template v-if="w.area">，仓库面积 {{ w.area }}</template>）</template>
              </div>
            </template>
            <span v-else-if="s.warehouse && s.warehouse.has">是</span>
            <span v-else>否</span>
          </div>
        </div>
      </div>

      <div class="detail-section" v-if="groupVisible('contact') && s.contacts && s.contacts.length">
        <h4>对外联系信息</h4>
        <el-table :data="s.contacts" size="small" border>
          <el-table-column v-if="canSeeField('contact.name')" prop="name" label="供应商联系人" width="120" />
          <el-table-column v-if="canSeeField('contact.title')" label="职务" width="120"><template #default="{ row }">{{ row.title || '' }}</template></el-table-column>
          <el-table-column v-if="canSeeField('contact.methods')" prop="methods" label="联系方式" min-width="140" />
          <el-table-column v-if="canSeeField('contact.note')" label="备注" min-width="140"><template #default="{ row }">{{ row.note || '' }}</template></el-table-column>
        </el-table>
      </div>

      <div class="detail-section" v-if="canSeeField('remark') && s.remark">
        <h4>补充信息</h4>
        <div class="v">{{ s.remark }}</div>
      </div>

      <div class="detail-section" v-if="groupVisible('exception')">
        <h4>异常 / 对接记录</h4>
        <el-timeline v-if="myExceptions.length">
          <el-timeline-item v-for="e in myExceptions" :key="e.id" placement="top">
            <div style="display: flex; align-items: center; gap: 8px">
              <el-tag v-if="canSeeField('exception.status')" :type="exStatusTag[e.status] || 'info'" size="small">{{ e.status }}</el-tag>
              <span v-if="canSeeField('exception.desc')" style="font-weight: 500">{{ e.desc }}</span>
            </div>
            <div v-if="canSeeField('exception.bizTypes') && exBiz(e).length" style="color: #9ca3af; font-size: 12px; margin-top: 4px">
              涉及业务：{{ exBiz(e).join('、') }}
            </div>
            <div v-if="canSeeField('exception.bizTypes') && exScn(e).length" style="color: #9ca3af; font-size: 12px; margin-top: 4px">
              服务场景：{{ exScn(e).join('、') }}
            </div>
            <div v-if="canSeeField('exception.regions') && e.regions && e.regions.length" style="color: #9ca3af; font-size: 12px; margin-top: 4px">
              涉及区域：{{ e.regions.map(regionName).join('、') }}
            </div>
            <div v-if="canSeeField('exception.refNo') && e.refNo" style="color: #9ca3af; font-size: 12px; margin-top: 4px">
              关联编号：{{ e.refNo }}
            </div>
            <div v-if="canSeeField('exception.images') && e.images && e.images.length" style="color: #9ca3af; font-size: 12px; margin-top: 4px">
              图片：{{ e.images.join('、') }}
            </div>
            <div v-if="canSeeField('exception.process') && e.process" style="margin-top: 4px; color: #6b7280">处理过程：{{ e.process }}</div>
            <div v-if="canSeeField('exception.result') && e.result" style="margin-top: 4px; color: #6b7280">结果说明：{{ e.result }}</div>
          </el-timeline-item>
        </el-timeline>
        <p v-else style="color: #9ca3af">暂无异常记录</p>
      </div>
    </template>

    <!-- 配置组弹窗 -->
    <el-dialog v-model="cfgModal.visible" :title="cfgModal.type === 'cn' ? '区域业务配置组' : '区域能力配置组'" width="520px" append-to-body>
      <el-form label-width="100px">
        <el-form-item label="适用区域" required>
          <TreeSelectSingle v-model="cfgModal.data.region" :data="regionForest" placeholder="选择适用区域" :width="420" />
        </el-form-item>
        <template v-if="cfgModal.type === 'cn'">
          <el-form-item label="业务类型">
            <el-checkbox-group v-model="cfgModal.data.bizTypes">
              <el-checkbox label="整柜">整柜</el-checkbox>
              <el-checkbox label="散货">散货</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item label="服务场景">
            <el-checkbox-group v-model="cfgModal.data.scenarios">
              <el-checkbox label="FBA">FBA</el-checkbox>
              <el-checkbox label="FBX">FBX</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item v-if="cfgModal.data.scenarios.includes('FBA')" label="FBA 备注"><el-input v-model="cfgModal.data.fbaNote" /></el-form-item>
          <el-form-item v-if="cfgModal.data.scenarios.includes('FBX')" label="FBX 备注"><el-input v-model="cfgModal.data.fbxNote" /></el-form-item>
        </template>
        <template v-else>
          <el-form-item label="服务能力" required>
            <el-select v-model="cfgModal.data.abilities" multiple filterable style="width: 100%" placeholder="选择服务能力">
              <el-option v-for="o in abilityOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
        </template>
        <el-form-item label="配置备注"><el-input v-model="cfgModal.data.note" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cfgModal.visible = false">取消</el-button>
        <el-button type="primary" @click="saveCfg">保存</el-button>
      </template>
    </el-dialog>

    <!-- 联系人弹窗 -->
    <el-dialog v-model="contactModal.visible" title="联系人" width="480px" append-to-body>
      <el-form label-width="130px">
        <el-form-item label="供应商联系人" required><el-input v-model="contactModal.data.name" /></el-form-item>
        <el-form-item label="职务"><el-input v-model="contactModal.data.title" /></el-form-item>
        <el-form-item label="联系方式"><el-input v-model="contactModal.data.methods" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="contactModal.data.note" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="contactModal.visible = false">取消</el-button>
        <el-button type="primary" @click="saveContact">保存</el-button>
      </template>
    </el-dialog>

    <!-- 仓库弹窗 -->
    <el-dialog v-model="whModal.visible" title="仓库信息" width="480px" append-to-body>
      <el-form label-width="130px">
        <el-form-item label="仓库所在城市" required>
          <TreeSelectSingle v-model="whModal.data.city" :data="regionForest" placeholder="选择港口城市" :width="420" />
        </el-form-item>
        <el-form-item label="地址"><el-input v-model="whModal.data.address" /></el-form-item>
        <el-form-item label="仓库面积"><el-input v-model="whModal.data.area" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="whModal.visible = false">取消</el-button>
        <el-button type="primary" @click="saveWh">保存</el-button>
      </template>
    </el-dialog>

    <!-- 异常记录弹窗 -->
    <el-dialog v-model="exVisible" title="新增异常 / 对接记录" width="520px" append-to-body>
      <el-form label-width="120px">
        <el-form-item v-if="canEditField('exception.refNo')" label="关联编号">
          <el-input v-model="exForm.refNo" placeholder="关联单号 / 柜号 / 业务编号" />
        </el-form-item>
        <el-form-item v-if="canEditField('exception.bizTypes')" label="涉及业务">
          <el-checkbox-group v-model="exForm.bizTypes">
            <el-checkbox label="整柜">整柜</el-checkbox>
            <el-checkbox label="散货">散货</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item v-if="canEditField('exception.bizTypes')" label="服务场景">
          <el-checkbox-group v-model="exForm.scenarios">
            <el-checkbox label="FBA">FBA</el-checkbox>
            <el-checkbox label="FBX">FBX</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item v-if="canEditField('exception.regions')" label="涉及区域">
          <TreeSelectPop v-model="exForm.regions" :data="regionForest" placeholder="选择涉及区域" :width="340" />
        </el-form-item>
        <el-form-item v-if="canEditField('exception.status')" label="处理状态">
          <el-select v-model="exForm.status" style="width: 100%">
            <el-option v-for="st in ['待处理', '处理中', '已解决', '暂无法解决']" :key="st" :label="st" :value="st" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="canEditField('exception.desc')" label="异常说明" required>
          <el-input v-model="exForm.desc" type="textarea" :rows="3" placeholder="必填" />
        </el-form-item>
        <el-form-item v-if="canEditField('exception.images')" label="相关图片">
          <el-upload
            v-model:file-list="exForm.images"
            action="#"
            :auto-upload="false"
            list-type="picture-card"
            multiple
          >
            <el-button size="small">添加图片</el-button>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="exVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEx">保存</el-button>
      </template>
    </el-dialog>
  </el-drawer>
</template>

<style scoped>
.edit-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.edit-label {
  color: #6b7280;
  white-space: nowrap;
  width: 90px;
}
.edit-subtitle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0 8px;
  color: #1f2937;
  font-weight: 500;
}
</style>
