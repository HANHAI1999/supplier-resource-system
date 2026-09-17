<script setup>
import { computed, ref } from 'vue'

// 自定义紧凑多选：收起时显示 "整柜 & 散货" 式摘要，弹出全选 + 复选组
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  options: { type: Array, required: true },
  placeholder: { type: String, default: '请选择' },
  width: { type: Number, default: 150 },
})
const emit = defineEmits(['update:modelValue'])

const visible = ref(false)

const summary = computed(() => (props.modelValue.length ? props.modelValue.join(' & ') : ''))
const isAll = computed(() => props.modelValue.length === props.options.length)
const isIndeterminate = computed(
  () => props.modelValue.length > 0 && props.modelValue.length < props.options.length
)

function toggleAll() {
  emit('update:modelValue', isAll.value ? [] : [...props.options])
}
function onCheck(v) {
  emit('update:modelValue', v)
}
</script>

<template>
  <el-popover v-model:visible="visible" trigger="click" :width="200" placement="bottom-start">
    <template #reference>
      <div class="pop-trigger" :style="{ width: width + 'px' }">
        <span v-if="!modelValue.length" class="ph">{{ placeholder }}</span>
        <span v-else class="sum">{{ summary }}</span>
        <el-icon class="arrow"><ArrowDown /></el-icon>
      </div>
    </template>
    <div class="multi-body">
      <el-checkbox :model-value="isAll" :indeterminate="isIndeterminate" @change="toggleAll">全选</el-checkbox>
      <el-checkbox-group :model-value="modelValue" @update:model-value="onCheck">
        <el-checkbox v-for="o in options" :key="o" :value="o">{{ o }}</el-checkbox>
      </el-checkbox-group>
    </div>
  </el-popover>
</template>

<style scoped>
.multi-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.multi-body .el-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 4px;
}
</style>
