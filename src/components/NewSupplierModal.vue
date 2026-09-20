<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { regionForest } from '../data/regions'
import { serviceAbilityTree } from '../data/serviceAbilities'
import { flattenForest, collectLabels, deriveRegions } from '../utils/options'
import TreeSelectPop from './TreeSelectPop.vue'
import TreeSelectSingle from './TreeSelectSingle.vue'

const props = defineProps({
  visible: Boolean,
  accountName: { type: String, default: '' },
})
const emit = defineEmits(['update:visible', 'create'])

const step = ref(1)

const regionLabel = collectLabels(regionForest)
const abilityLabel = collectLabels(serviceAbilityTree)
const regionName = (v) => regionLabel[v] || v
const abilityName = (v) => abilityLabel[v] || v
const regionOptions = flattenForest(regionForest)
const abilityOptions = flattenForest(serviceAbilityTree)

// 区域父级映射（用于继承提示）
function buildParent(forest, map = {}, p = null) {
  for (const n of forest) {
    map[n.value] = p
    if (n.children) buildParent(n.children, map, n.value)
  }
  return map
}
const regionParent = buildParent(regionForest)

const form = reactive({
  name: '',
  reconPerson: '',
  capacity: '',
  status: '使用中',
  paymentTerms: '月结',
  contract: '是',
  entity: '劲港',
  internalContact: [],
  pools: [],
  intro: '',
  cnConfigs: [],
  abilityConfigs: [],
  usPool: [],
  fleetHas: false,
  trucks: 0,
  frames: 0,
  boxes: 0,
  whHas: false,
  warehouseList: [],
  contacts: [],
  remark: '',
})

function resetForm() {
  Object.assign(form, {
    name: '',
    reconPerson: '',
    capacity: '',
    status: '使用中',
    paymentTerms: '月结',
    contract: '是',
    entity: '劲港',
    internalContact: [],
    pools: [],
    intro: '',
    cnConfigs: [],
    abilityConfigs: [],
    usPool: [],
    fleetHas: false,
    trucks: 0,
    frames: 0,
    boxes: 0,
    whHas: false,
    warehouseList: [],
    contacts: [],
    remark: '',
  })
  step.value = 1
}

function close() {
  emit('update:visible', false)
}

// 第一步 → 第二步：校验主档必填（覆盖区域由配置组自动汇总，不再手填）
function nextStep() {
  if (!form.name.trim()) return ElMessage.warning('请填写供应商名称')
  if (!form.status) return ElMessage.warning('请选择合作状态')
  if (!form.entity) return ElMessage.warning('请选择合作主体')
  if (!form.pools.length) return ElMessage.warning('请选择资源盘归属')
  step.value = 2
}

function submit() {
  if (form.pools.includes('美盈资源池') && !form.usPool.length) {
    ElMessage.warning('选择美盈资源池时需指定美西 / 美东归属')
    return
  }
  const cnConfigs = form.cnConfigs.map((c) => ({ ...c, bizTypes: [...c.bizTypes], scenarios: [...c.scenarios] }))
  const abilityConfigs = form.abilityConfigs.map((c) => ({ ...c, abilities: [...c.abilities] }))
  emit('create', {
    name: form.name,
    reconPerson: form.reconPerson,
    capacity: form.capacity,
    status: form.status,
    paymentTerms: form.paymentTerms,
    contract: form.contract,
    entity: form.entity,
    internalContact: [...form.internalContact],
    pools: [...form.pools],
    regions: deriveRegions({ cnConfigs, abilityConfigs }),
    intro: form.intro,
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
  ElMessage.success('供应商已创建')
  close()
}

// 配置组宽 Drawer
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
// 继承提示：所选区域是否存在父级配置
const parentConfig = computed(() => {
  const r = cfgModal.data.region
  if (!r) return null
  let p = regionParent[r]
  while (p) {
    const hit = [...form.cnConfigs, ...form.abilityConfigs].find((c) => c.region === p)
    if (hit) return hit
    p = regionParent[p]
  }
  return null
})
function saveCfg() {
  const d = cfgModal.data
  if (!d.region) return ElMessage.warning('请选择适用区域')
  if (cfgModal.type === 'cn') {
    if (!d.bizTypes.length && !d.scenarios.length) return ElMessage.warning('至少选择一项业务类型或服务场景')
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
    if (!d.abilities.length) return ElMessage.warning('至少选择一项服务能力')
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
  if (!contactModal.data.name.trim()) return ElMessage.warning('请填写联系人姓名')
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
  if (!whModal.data.city) return ElMessage.warning('请选择仓库所在城市')
  const item = { ...whModal.data }
  if (whModal.index >= 0) form.warehouseList[whModal.index] = item
  else form.warehouseList.push(item)
  whModal.visible = false
}
</script>

<template>
  <el-drawer :model-value="visible" size="60%" @close="close" @open="resetForm">
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
        <span style="font-weight: 600">新增供应商</span>
      </div>
    </template>

    <el-steps :active="step - 1" finish-status="success" align-center style="margin-bottom: 20px">
      <el-step title="供应商主档" />
      <el-step title="资源配置" />
      <el-step title="补充信息" />
    </el-steps>

    <!-- ============ 第一步：供应商主档 ============ -->
    <template v-if="step === 1">
      <el-form label-width="130px" style="max-width: 680px">
        <el-form-item label="供应商名称" required><el-input v-model="form.name" placeholder="必填" /></el-form-item>
        <el-form-item label="对账人"><el-input v-model="form.reconPerson" /></el-form-item>
        <el-form-item label="供应商承接能力"><el-input v-model="form.capacity" /></el-form-item>
        <el-form-item label="合作状态" required>
          <el-select v-model="form.status" style="width: 100%">
            <el-option v-for="s in ['使用中', '储备', '暂停合作', '已淘汰']" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="供应商账期">
          <el-select v-model="form.paymentTerms" style="width: 100%">
            <el-option v-for="p in ['月结', '半月结', '周结']" :key="p" :label="p" :value="p" />
          </el-select>
        </el-form-item>
        <el-form-item label="是否签署合同">
          <el-radio-group v-model="form.contract">
            <el-radio label="是">是</el-radio>
            <el-radio label="否">否</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="合作主体" required>
          <el-select v-model="form.entity" style="width: 100%">
            <el-option v-for="e in ['劲港', '美盈', '劲港和美盈']" :key="e" :label="e" :value="e" />
          </el-select>
        </el-form-item>
        <el-form-item label="内部对接人">
          <el-select v-model="form.internalContact" multiple clearable style="width: 100%">
            <el-option v-for="c in ['Haven', 'Jay', 'Ryan']" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="资源盘归属" required>
          <el-checkbox-group v-model="form.pools">
            <el-checkbox label="国内/后段资源盘">劲港资源池</el-checkbox>
            <el-checkbox label="美盈资源池">美盈资源池</el-checkbox>
          </el-checkbox-group>
          <div style="color: #9ca3af; font-size: 12px">供应商覆盖区域不用填，由下方配置组的适用区域自动汇总</div>
        </el-form-item>
        <el-form-item label="公司介绍">
          <el-input v-model="form.intro" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
    </template>

    <!-- ============ 第二步：资源配置（按资源盘显示配置卡片） ============ -->
    <template v-else-if="step === 2">
      <!-- 国内配置卡片 -->
      <div class="cfg-card" v-if="form.pools.includes('国内/后段资源盘')">
        <div class="cfg-card-head">
          <div>
            <div class="cfg-title">劲港资源池</div>
            <div class="cfg-sub">已添加 {{ form.cnConfigs.length }} 个区域业务配置组</div>
          </div>
          <el-button type="primary" plain @click="openCfg('cn')">+ 添加国内配置</el-button>
        </div>
        <el-table v-if="form.cnConfigs.length" :data="form.cnConfigs" size="small" border>
          <el-table-column label="适用区域" width="140"><template #default="{ row }">{{ regionName(row.region) }}</template></el-table-column>
          <el-table-column label="业务类型"><template #default="{ row }">{{ row.bizTypes.join('、') || '' }}</template></el-table-column>
          <el-table-column label="服务场景"><template #default="{ row }">{{ row.scenarios.join('、') || '' }}</template></el-table-column>
          <el-table-column label="FBA 备注"><template #default="{ row }">{{ row.fbaNote || '' }}</template></el-table-column>
          <el-table-column label="FBX 备注"><template #default="{ row }">{{ row.fbxNote || '' }}</template></el-table-column>
          <el-table-column label="配置备注"><template #default="{ row }">{{ row.note || '' }}</template></el-table-column>
          <el-table-column label="操作" width="130">
            <template #default="{ $index }">
              <el-button link type="primary" size="small" @click="openCfg('cn', $index)">编辑</el-button>
              <el-button link type="danger" size="small" @click="form.cnConfigs.splice($index, 1)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <p v-else class="cfg-empty">未单独配置的区域将自动继承其父级配置</p>
      </div>

      <!-- 美国配置卡片 -->
      <div class="cfg-card" v-if="form.pools.includes('美盈资源池')">
        <div class="cfg-card-head">
          <div>
            <div class="cfg-title">美盈资源池</div>
            <div class="cfg-sub">已添加 {{ form.abilityConfigs.length }} 个区域能力配置组</div>
          </div>
          <el-button type="primary" plain @click="openCfg('us')">+ 添加美国配置</el-button>
        </div>
        <div class="edit-row">
          <span class="edit-label">美国资源池归属</span>
          <el-checkbox-group v-model="form.usPool">
            <el-checkbox label="美西">美西</el-checkbox>
            <el-checkbox label="美东">美东</el-checkbox>
          </el-checkbox-group>
        </div>
        <el-table v-if="form.abilityConfigs.length" :data="form.abilityConfigs" size="small" border>
          <el-table-column label="适用区域" width="140"><template #default="{ row }">{{ regionName(row.region) }}</template></el-table-column>
          <el-table-column label="服务能力"><template #default="{ row }">{{ row.abilities.map(abilityName).join('、') || '' }}</template></el-table-column>
          <el-table-column label="配置备注"><template #default="{ row }">{{ row.note || '' }}</template></el-table-column>
          <el-table-column label="操作" width="130">
            <template #default="{ $index }">
              <el-button link type="primary" size="small" @click="openCfg('us', $index)">编辑</el-button>
              <el-button link type="danger" size="small" @click="form.abilityConfigs.splice($index, 1)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <p v-else class="cfg-empty">未单独配置的区域将自动继承其父级配置</p>
      </div>
    </template>

    <!-- ============ 第三步：补充信息 ============ -->
    <template v-else>
      <div class="detail-section">
        <h4>资源实力</h4>
        <div class="edit-row">
          <span class="edit-label">自有车队</span>
          <el-switch v-model="form.fleetHas" />
          <template v-if="form.fleetHas">
            <el-input-number v-model="form.trucks" :min="0" size="small" /> 车头
            <el-input-number v-model="form.frames" :min="0" size="small" /> 车架
            <el-input-number v-model="form.boxes" :min="0" size="small" /> 车厢
          </template>
        </div>
        <div class="edit-row">
          <span class="edit-label">自有仓库</span>
          <el-switch v-model="form.whHas" />
          <el-button v-if="form.whHas" size="small" type="primary" plain @click="openWh()">+ 添加仓库</el-button>
        </div>
        <el-table v-if="form.whHas" :data="form.warehouseList" size="small" border style="margin-top: 8px">
          <el-table-column label="仓库所在城市" min-width="140"><template #default="{ row }">{{ regionName(row.city || row.name) }}</template></el-table-column>
          <el-table-column prop="address" label="地址" min-width="180" />
          <el-table-column prop="area" label="仓库面积" width="110" />
          <el-table-column label="操作" width="130">
            <template #default="{ $index }">
              <el-button link type="primary" size="small" @click="openWh($index)">编辑</el-button>
              <el-button link type="danger" size="small" @click="form.warehouseList.splice($index, 1)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="detail-section">
        <h4>对外联系信息</h4>
        <div class="edit-subtitle">
          联系人（可新增多个）
          <el-button size="small" type="primary" plain @click="openContact()">+ 添加联系人</el-button>
        </div>
        <el-table :data="form.contacts" size="small" border>
          <el-table-column prop="name" label="供应商联系人" width="130" />
          <el-table-column label="职务" width="130"><template #default="{ row }">{{ row.title || '' }}</template></el-table-column>
          <el-table-column prop="methods" label="联系方式" min-width="140" />
          <el-table-column label="备注" min-width="140"><template #default="{ row }">{{ row.note || '' }}</template></el-table-column>
          <el-table-column label="操作" width="130">
            <template #default="{ $index }">
              <el-button link type="primary" size="small" @click="openContact($index)">编辑</el-button>
              <el-button link type="danger" size="small" @click="form.contacts.splice($index, 1)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="detail-section">
        <h4>备注</h4>
        <el-input v-model="form.remark" type="textarea" :rows="2" style="max-width: 560px" placeholder="备注" />
      </div>
    </template>

    <!-- 底部按钮 -->
    <div style="margin-top: 16px; text-align: right">
      <el-button @click="close">取消</el-button>
      <el-button v-if="step > 1" @click="step -= 1">上一步</el-button>
      <el-button v-if="step < 3" type="primary" @click="step === 1 ? nextStep() : (step = 3)">下一步</el-button>
      <el-button v-else type="primary" @click="submit">保存</el-button>
    </div>

    <!-- 配置组宽 Drawer -->
    <el-drawer v-model="cfgModal.visible" size="44%" append-to-body :with-header="true">
      <template #header>
        <span style="font-weight: 600">{{ cfgModal.type === 'cn' ? '添加国内区域业务配置' : '添加美国区域能力配置' }}</span>
      </template>
      <el-form label-width="110px">
        <el-form-item label="适用区域" required>
          <TreeSelectSingle v-model="cfgModal.data.region" :data="regionForest" placeholder="选择适用区域" :width="420" />
        </el-form-item>
        <el-alert
          v-if="parentConfig"
          type="warning"
          :closable="false"
          show-icon
          style="margin-bottom: 12px"
          :title="`检测到父级「${regionName(parentConfig.region)}」已有配置，保存后本区域将覆盖父级的继承结果`"
        />
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
            <TreeSelectPop v-model="cfgModal.data.abilities" :data="serviceAbilityTree" placeholder="选择服务能力" :width="420" />
          </el-form-item>
        </template>
        <el-form-item label="配置备注"><el-input v-model="cfgModal.data.note" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <div style="text-align: right; margin-top: 16px">
        <el-button @click="cfgModal.visible = false">取消</el-button>
        <el-button type="primary" @click="saveCfg">保存配置</el-button>
      </div>
    </el-drawer>

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
  </el-drawer>
</template>

<style scoped>
.detail-section {
  margin-bottom: 20px;
}
.detail-section h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #1f2937;
}
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
  width: 110px;
}
.edit-subtitle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0 8px;
  color: #1f2937;
  font-weight: 500;
}
.cfg-card {
  border: 1px solid #e5e6eb;
  border-radius: 6px;
  padding: 14px 16px;
  margin-bottom: 14px;
  background: #f8fafc;
}
.cfg-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.cfg-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}
.cfg-sub {
  color: #9ca3af;
  font-size: 12px;
  margin-top: 2px;
}
.cfg-empty {
  color: #9ca3af;
  font-size: 12px;
}
</style>
