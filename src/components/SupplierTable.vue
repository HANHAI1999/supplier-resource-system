<script setup>
import { regionForest } from '../data/regions'
import { serviceAbilityTree } from '../data/serviceAbilities'
import { collectLabels, deriveRegions } from '../utils/options'

defineProps({
  suppliers: Array,
})
const emit = defineEmits(['open'])

const statusTag = { 使用中: 'success', 储备: 'warning', 暂停合作: 'danger', 已淘汰: 'info' }
const regionLabel = collectLabels(regionForest)
const abilityLabel = collectLabels(serviceAbilityTree)
const regionName = (v) => regionLabel[v] || v
const abilityName = (v) => abilityLabel[v] || v

// 业务类型：国内 bizTypes 并集；若只有美国能力则显示服务能力并集
function bizTypeSummary(row) {
  const biz = new Set()
  const abil = new Set()
  for (const c of row.cnConfigs || []) (c.bizTypes || []).forEach((b) => biz.add(b))
  for (const c of row.abilityConfigs || []) (c.abilities || []).forEach((a) => abil.add(a))
  if (biz.size) return [...biz].join(' & ')
  if (abil.size) return [...abil].map(abilityName).join(' · ')
  return '—'
}

// 服务场景：scenarios 并集（FBA / FBX / FBA & FBX）
function scenarioSummary(row) {
  const scn = new Set()
  for (const c of row.cnConfigs || []) (c.scenarios || []).forEach((s) => scn.add(s))
  return scn.size ? [...scn].join(' & ') : '—'
}
</script>

<template>
  <div class="table-card">
    <div class="table-head">
      <span class="count">共 {{ suppliers.length }} 家供应商</span>
    </div>
    <el-table :data="suppliers" style="cursor: pointer" @row-click="(row) => emit('open', row)">
      <el-table-column label="供应商名称" min-width="170">
        <template #default="{ row }">
          <el-link type="primary" :underline="false">{{ row.name }}</el-link>
        </template>
      </el-table-column>
      <el-table-column label="合作状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTag[row.status] || 'info'" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="paymentTerms" label="供应商账期" width="110" />
      <el-table-column label="资源实力" min-width="120">
        <template #default="{ row }">
          <div style="line-height: 22px">
            <el-tag v-if="row.fleet?.has" size="small" type="info">自有车队</el-tag>
            <span v-else style="color: #9ca3af; font-size: 12px">无车队</span>
          </div>
          <div style="line-height: 22px">
            <el-tag v-if="row.warehouse?.has" size="small" type="info">自有仓库</el-tag>
            <span v-else style="color: #9ca3af; font-size: 12px">无仓库</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="覆盖区域" min-width="180">
        <template #default="{ row }">
          <template v-if="deriveRegions(row).length">
            <el-tag v-for="r in deriveRegions(row)" :key="r" size="small" type="info" style="margin: 2px 4px 2px 0">
              {{ regionName(r) }}
            </el-tag>
          </template>
          <span v-else style="color: #9ca3af">—</span>
        </template>
      </el-table-column>
      <el-table-column label="业务类型" min-width="130">
        <template #default="{ row }">
          <span style="font-size: 12px; color: #6b7280">{{ bizTypeSummary(row) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="服务场景" min-width="130">
        <template #default="{ row }">
          <span style="font-size: 12px; color: #6b7280">{{ scenarioSummary(row) }}</span>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
