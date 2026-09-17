<script setup>
import { computed } from 'vue'
import { regionForest } from '../data/regions'
import { serviceAbilityTree } from '../data/serviceAbilities'
import { collectLabels } from '../utils/options'
import TreeSelectPop from './TreeSelectPop.vue'
import MultiSelectPop from './MultiSelectPop.vue'

const props = defineProps({
  view: Object,
  filters: Object,
})
const emit = defineEmits(['reset'])

const statusOptions = ['使用中', '储备', '暂停合作', '已淘汰']
const regionLabel = collectLabels(regionForest)
const abilityLabel = collectLabels(serviceAbilityTree)

// 已选条件 Tag：单项移除
const tags = computed(() => {
  const t = []
  if (props.filters.keyword) t.push({ type: 'keyword', label: `名称：${props.filters.keyword}` })
  for (const v of props.filters.regions) t.push({ type: 'region', value: v, label: `区域：${regionLabel[v] || v}` })
  for (const v of props.filters.bizTypes) t.push({ type: 'biz', value: v, label: `业务类型：${v}` })
  for (const v of props.filters.scenarios) t.push({ type: 'scn', value: v, label: `服务场景：${v}` })
  for (const v of props.filters.abilities) t.push({ type: 'abil', value: v, label: `服务能力：${abilityLabel[v] || v}` })
  if (props.filters.status) t.push({ type: 'status', label: `合作状态：${props.filters.status}` })
  return t
})

function removeTag(tag) {
  const f = props.filters
  if (tag.type === 'keyword') f.keyword = ''
  else if (tag.type === 'region') f.regions = f.regions.filter((v) => v !== tag.value)
  else if (tag.type === 'biz') f.bizTypes = f.bizTypes.filter((v) => v !== tag.value)
  else if (tag.type === 'scn') f.scenarios = f.scenarios.filter((v) => v !== tag.value)
  else if (tag.type === 'abil') f.abilities = f.abilities.filter((v) => v !== tag.value)
  else if (tag.type === 'status') f.status = ''
}
</script>

<template>
  <div class="filter-card">
    <div class="filter-row">
      <div class="filter-item">
        <span class="label">供应商名称</span>
        <el-input v-model="filters.keyword" placeholder="关键词搜索" clearable style="width: 200px" />
      </div>

      <div class="filter-item">
        <span class="label">覆盖区域</span>
        <TreeSelectPop v-model="filters.regions" :data="regionForest" placeholder="选择区域" :width="260" />
      </div>

      <template v-if="view.kind === 'cn'">
        <div class="filter-item">
          <span class="label">业务类型</span>
          <MultiSelectPop v-model="filters.bizTypes" :options="['整柜', '散货']" placeholder="全部" :width="150" />
        </div>
        <div class="filter-item">
          <span class="label">服务场景</span>
          <MultiSelectPop v-model="filters.scenarios" :options="['FBA', 'FBX']" placeholder="全部" :width="150" />
        </div>
      </template>

      <template v-else-if="view.kind === 'us'">
        <div class="filter-item">
          <span class="label">服务能力</span>
          <TreeSelectPop v-model="filters.abilities" :data="serviceAbilityTree" placeholder="选择服务能力" :width="260" />
        </div>
      </template>

      <template v-else-if="view.kind === 'map'">
        <div class="filter-item">
          <span class="label">业务类型</span>
          <MultiSelectPop v-model="filters.bizTypes" :options="['整柜', '散货']" placeholder="全部" :width="150" />
        </div>
        <div class="filter-item">
          <span class="label">服务场景</span>
          <MultiSelectPop v-model="filters.scenarios" :options="['FBA', 'FBX']" placeholder="全部" :width="150" />
        </div>
        <div class="filter-item">
          <span class="label">服务能力</span>
          <TreeSelectPop v-model="filters.abilities" :data="serviceAbilityTree" placeholder="选择服务能力" :width="260" />
        </div>
      </template>

      <div class="filter-item">
        <span class="label">合作状态</span>
        <el-select v-model="filters.status" clearable placeholder="全部" style="width: 130px">
          <el-option v-for="s in statusOptions" :key="s" :label="s" :value="s" />
        </el-select>
      </div>
    </div>

    <div v-if="tags.length" class="filter-tags">
      <el-tag
        v-for="t in tags"
        :key="t.type + (t.value || '')"
        closable
        size="small"
        @close="removeTag(t)"
      >
        {{ t.label }}
      </el-tag>
      <el-button link type="primary" size="small" @click="emit('reset')">一键清空</el-button>
    </div>
  </div>
</template>
