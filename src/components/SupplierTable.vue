<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import Sortable from 'sortablejs'
import { regionForest } from '../data/regions'
import { serviceAbilityTree } from '../data/serviceAbilities'
import { collectLabels, deriveRegions } from '../utils/options'

const props = defineProps({
  suppliers: Array,
  canSort: { type: Boolean, default: false }, // 仅管理员可拖拽排序
})
const emit = defineEmits(['open', 'reorder'])

const statusTag = { 使用中: 'success', 储备: 'warning', 暂停合作: 'danger', 已淘汰: 'info' }
const regionLabel = collectLabels(regionForest)
const abilityLabel = collectLabels(serviceAbilityTree)
const regionName = (v) => regionLabel[v] || v
const abilityName = (v) => abilityLabel[v] || v

function bizTypeSummary(row) {
  const biz = new Set()
  const abil = new Set()
  for (const c of row.cnConfigs || []) (c.bizTypes || []).forEach((b) => biz.add(b))
  for (const c of row.abilityConfigs || []) (c.abilities || []).forEach((a) => abil.add(a))
  if (biz.size) return [...biz].join(' & ')
  if (abil.size) return [...abil].map(abilityName).join(' · ')
  return '—'
}

function scenarioSummary(row) {
  const scn = new Set()
  for (const c of row.cnConfigs || []) (c.scenarios || []).forEach((s) => scn.add(s))
  return scn.size ? [...scn].join(' & ') : '—'
}

// 拖拽排序（手柄拖动整行）
const tableRef = ref(null)
let sortable = null
function initSortable() {
  if (!props.canSort || !tableRef.value) return
  const tbody = tableRef.value.$el?.querySelector('.el-table__body-wrapper tbody')
  if (!tbody) return
  if (sortable) sortable.destroy()
  sortable = Sortable.create(tbody, {
    handle: '.drag-handle',
    animation: 150,
    onEnd: () => {
      const ids = [...tbody.querySelectorAll('tr')]
        .map((tr) => tr.dataset.rowKey)
        .filter(Boolean)
      if (ids.length) emit('reorder', ids)
    },
  })
}
onMounted(() => nextTick(initSortable))
watch(
  () => [props.suppliers, props.canSort],
  () => nextTick(initSortable)
)
onUnmounted(() => sortable?.destroy())
</script>

<template>
  <div class="table-card">
    <div class="table-head">
      <span class="count">共 {{ suppliers.length }} 家供应商</span>
      <span v-if="canSort" style="color: #9ca3af; font-size: 12px">拖拽手柄可调整顺序</span>
    </div>
    <el-table
      ref="tableRef"
      :data="suppliers"
      :row-key="(row) => row.id"
      style="cursor: pointer"
      @row-click="(row) => emit('open', row)"
    >
      <el-table-column v-if="canSort" width="44" align="center">
        <template #default>
          <el-icon class="drag-handle" style="cursor: grab"><Rank /></el-icon>
        </template>
      </el-table-column>
      <el-table-column label="供应商名称" min-width="160">
        <template #default="{ row }">
          <el-link type="primary" :underline="false">{{ row.name }}</el-link>
        </template>
      </el-table-column>
      <el-table-column label="合作状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTag[row.status] || 'info'" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
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
      <el-table-column label="覆盖区域" min-width="170">
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
      <el-table-column label="备注" min-width="160">
        <template #default="{ row }">
          <span style="font-size: 12px; color: #6b7280">{{ row.remark || '—' }}</span>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
