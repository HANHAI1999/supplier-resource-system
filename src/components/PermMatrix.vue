<script setup>
import { computed } from 'vue'
import { useStore, permFieldGroups } from '../store'

const store = useStore()

const pools = [
  { key: 'cn', label: '劲港资源池' },
  { key: 'us-west', label: '美西调度' },
  { key: 'us-east', label: '美东调度' },
]

// 字段树拍平成表格行（模块列做行合并）
const rows = computed(() => {
  const out = []
  for (const g of permFieldGroups) {
    g.fields.forEach((f, i) =>
      out.push({ ...f, group: g.label, first: i === 0, groupSize: g.fields.length })
    )
  }
  return out
})

function spanMethod({ row, columnIndex }) {
  if (columnIndex === 0) {
    if (row.first) return { rowspan: row.groupSize, colspan: 1 }
    return { rowspan: 0, colspan: 0 }
  }
  return { rowspan: 1, colspan: 1 }
}

function has(poolKey, fieldKey, kind) {
  return store.viewPermissions[poolKey][kind].includes(fieldKey)
}
function toggle(poolKey, fieldKey, kind, val) {
  const cur = store.viewPermissions[poolKey][kind]
  store.viewPermissions[poolKey][kind] = val ? [...cur, fieldKey] : cur.filter((k) => k !== fieldKey)
}
</script>

<template>
  <el-table :data="rows" size="small" border :span-method="spanMethod" max-height="560">
    <el-table-column prop="group" label="信息模块" width="170" />
    <el-table-column prop="label" label="字段" width="210" />
    <template v-for="p in pools" :key="p.key">
      <el-table-column :label="`${p.label} · 可见`" width="88" align="center">
        <template #default="{ row }">
          <el-checkbox
            :model-value="has(p.key, row.key, 'visible')"
            @change="(v) => toggle(p.key, row.key, 'visible', v)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="`${p.label} · 可编辑`" width="88" align="center">
        <template #default="{ row }">
          <el-checkbox
            :model-value="has(p.key, row.key, 'editable')"
            :disabled="!has(p.key, row.key, 'visible')"
            @change="(v) => toggle(p.key, row.key, 'editable', v)"
          />
        </template>
      </el-table-column>
    </template>
  </el-table>
</template>
