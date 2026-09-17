<script setup>
import { computed, ref, watch } from 'vue'

// 自定义树形多选：父子联动（勾父级自动勾选全部子级），触发器显示已选摘要
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  data: { type: Array, required: true },
  placeholder: { type: String, default: '请选择' },
  width: { type: Number, default: 240 },
})
const emit = defineEmits(['update:modelValue'])

const visible = ref(false)
const treeRef = ref(null)

function collect(nodes, map = {}) {
  for (const n of nodes) {
    map[n.value] = n.label
    if (n.children) collect(n.children, map)
  }
  return map
}
const labelMap = collect(props.data)

// 构建父级映射：value -> 父 value
function buildParent(nodes, parentMap = {}, parentValue = null) {
  for (const n of nodes) {
    parentMap[n.value] = parentValue
    if (n.children) buildParent(n.children, parentMap, n.value)
  }
  return parentMap
}
const parentMap = buildParent(props.data)

// 最小化勾选集合：若某节点的祖先也被勾选，则该节点不单独作为筛选条件
// 例：勾"美西"联动勾中 7 个港口 -> 只保留"美西"；筛选语义仍是"美西区域"，不会变成 7 港 AND
function minimize(keys) {
  const set = new Set(keys)
  return keys.filter((k) => {
    let p = parentMap[k]
    while (p) {
      if (set.has(p)) return false
      p = parentMap[p]
    }
    return true
  })
}

const summary = computed(() =>
  props.modelValue.length ? props.modelValue.map((v) => labelMap[v] || v).join('、') : ''
)

watch(
  () => props.modelValue,
  (v) => {
    if (treeRef.value && Array.isArray(v)) treeRef.value.setCheckedKeys(v)
  }
)

function onCheck() {
  emit('update:modelValue', minimize(treeRef.value.getCheckedKeys()))
}
function clearAll() {
  emit('update:modelValue', [])
  treeRef.value?.setCheckedKeys([])
}
</script>

<template>
  <el-popover
    v-model:visible="visible"
    trigger="click"
    :width="Math.max(width, 320)"
    placement="bottom-start"
  >
    <template #reference>
      <div class="pop-trigger" :style="{ width: width + 'px' }">
        <span v-if="!modelValue.length" class="ph">{{ placeholder }}</span>
        <span v-else class="sum">{{ summary }}</span>
        <el-icon class="arrow"><ArrowDown /></el-icon>
      </div>
    </template>
    <el-tree
      ref="treeRef"
      :data="data"
      show-checkbox
      node-key="value"
      default-expand-all
      :default-checked-keys="modelValue"
      class="tree-pop-tree"
      @check="onCheck"
    />
    <div class="pop-foot">
      <el-button link type="primary" size="small" @click="clearAll">清空</el-button>
    </div>
  </el-popover>
</template>

<style scoped>
.tree-pop-tree {
  max-height: 320px;
  overflow: auto;
}
.pop-foot {
  text-align: right;
  padding-top: 6px;
  border-top: 1px solid #f1f5f9;
  margin-top: 6px;
}
</style>
