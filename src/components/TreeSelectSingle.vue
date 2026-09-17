<script setup>
import { computed, ref } from 'vue'

// 树形单选：像筛选器那样弹出真树，点击节点选中（用于配置组适用区域、仓库所在城市等单选场景）
const props = defineProps({
  modelValue: { type: String, default: '' },
  data: { type: Array, required: true },
  placeholder: { type: String, default: '请选择' },
  width: { type: Number, default: 260 },
})
const emit = defineEmits(['update:modelValue'])

const visible = ref(false)

function collect(nodes, map = {}) {
  for (const n of nodes) {
    map[n.value] = n.label
    if (n.children) collect(n.children, map)
  }
  return map
}
const labelMap = collect(props.data)
const summary = computed(() => (props.modelValue ? labelMap[props.modelValue] || props.modelValue : ''))

function onNodeClick(node) {
  emit('update:modelValue', node.value)
  visible.value = false
}
function clear() {
  emit('update:modelValue', '')
}
</script>

<template>
  <el-popover v-model:visible="visible" trigger="click" :width="Math.max(width, 320)" placement="bottom-start">
    <template #reference>
      <div class="pop-trigger" :style="{ width: width + 'px' }">
        <span v-if="!modelValue" class="ph">{{ placeholder }}</span>
        <span v-else class="sum">{{ summary }}</span>
        <el-icon class="arrow"><ArrowDown /></el-icon>
      </div>
    </template>
    <el-tree
      :data="data"
      node-key="value"
      highlight-current
      default-expand-all
      :current-node-key="modelValue"
      :props="{ label: 'label', children: 'children' }"
      class="tree-pop-tree"
      @node-click="onNodeClick"
    />
    <div class="pop-foot">
      <el-button link type="primary" size="small" @click="clear">清空</el-button>
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
