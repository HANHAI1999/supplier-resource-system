<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { regionForest } from '../data/regions'
import { serviceAbilityTree } from '../data/serviceAbilities'
import { collectLabels, deriveRegions } from '../utils/options'
import { usCityCoords } from '../data/usCities'

const props = defineProps({
  suppliers: Array,
})
const emit = defineEmits(['open'])

const chartRef = ref(null)
let chart = null
const nodeDrawer = ref(false)
const activeNode = ref(null)
const legendOpen = ref(['legend'])

// 四大区域分组（来自区域树：美西/美东/美湾/美中 → 节点）
const regionGroups = computed(() => {
  const root = regionForest[0]
  return (root?.children || []).map((g) => ({
    name: g.label,
    nodes: (g.children || []).map((n) => n.label).join('、'),
  }))
})

const regionLabel = collectLabels(regionForest)
const abilityLabel = collectLabels(serviceAbilityTree)
const regionName = (v) => regionLabel[v] || v
const abilityName = (v) => abilityLabel[v] || v

// 供应商 -> 城市节点聚合
const nodes = computed(() => {
  const map = new Map()
  for (const s of props.suppliers || []) {
    const bizSet = new Set()
    const scnSet = new Set()
    for (const c of s.cnConfigs || []) {
      ;(c.bizTypes || []).forEach((b) => bizSet.add(b))
      ;(c.scenarios || []).forEach((x) => scnSet.add(x))
    }
    const abilSet = new Set()
    for (const c of s.abilityConfigs || []) (c.abilities || []).forEach((a) => abilSet.add(a))
    const bizText = [...bizSet].join('·')
    const scnText = [...scnSet].join('·')
    const abilText = [...abilSet].map(abilityName).join('·')

    for (const r of deriveRegions(s)) {
      const coord = usCityCoords[r]
      if (!coord) continue
      const key = r
      if (!map.has(key)) map.set(key, { name: regionName(r), value: [...coord, 0], count: 0, suppliers: [], biz: new Set() })
      const node = map.get(key)
      node.count += 1
      node.suppliers.push(s)
      if (bizText) node.biz.add(bizText)
      if (scnText) node.biz.add(scnText)
      if (abilText) node.biz.add(abilText)
    }
  }
  return [...map.values()].map((n) => ({
    ...n,
    value: [n.value[0], n.value[1], n.count],
    biz: [...n.biz].join(' / '),
  }))
})

function buildOption() {
  return {
    backgroundColor: '#eef2f7',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#ffffff',
      borderColor: '#e5e7eb',
      textStyle: { color: '#1f2937', fontSize: 12 },
      formatter: (p) => {
        const n = p.data
        return `<b>${n.name}</b><br/>供应商数量：${n.count}<br/>主要业务：${n.biz || '—'}`
      },
    },
    geo: {
      map: 'USA',
      roam: false,
      zoom: zoomLevel.value,
      center: [-98, 38.5],
      aspectScale: 0.95,
      itemStyle: {
        areaColor: '#dde5ee',
        borderColor: '#b8c4d4',
        borderWidth: 0.6,
      },
      emphasis: {
        itemStyle: { areaColor: '#d3dce8' },
        label: { show: false },
      },
    },
    series: [
      {
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: nodes.value,
        symbolSize: (val) => Math.min(10 + val[2] * 6, 36),
        rippleEffect: { brushType: 'stroke', scale: 2.2 },
        itemStyle: { color: '#2563eb', shadowBlur: 8, shadowColor: 'rgba(37,99,235,0.3)' },
        label: { show: false },
      },
    ],
  }
}

function render() {
  if (!chart) return
  chart.setOption(buildOption(), true)
}

// 右下角 +/- 按钮等比例缩放（不开放滚轮/拖拽）
const zoomLevel = ref(1.05)
function zoomIn() {
  zoomLevel.value = Math.min(zoomLevel.value + 0.2, 2.2)
  render()
}
function zoomOut() {
  zoomLevel.value = Math.max(zoomLevel.value - 0.2, 0.7)
  render()
}

function onChartClick(params) {
  if (params.seriesType === 'effectScatter' && params.data?.suppliers?.length) {
    activeNode.value = params.data
    nodeDrawer.value = true
  }
}

onMounted(async () => {
  try {
    const res = await fetch('./us-states.json')
    const geo = await res.json()
    // 公司资源不覆盖阿拉斯加 / 夏威夷，去掉非本土州
    geo.features = (geo.features || []).filter((f) => !['Alaska', 'Hawaii'].includes(f.properties?.name))
    echarts.registerMap('USA', geo)
  } catch {
    /* 底图加载失败时节点仍可渲染（无州界） */
  }
  chart = echarts.init(chartRef.value)
  chart.on('click', onChartClick)
  render()
  window.addEventListener('resize', handleResize)
})

function handleResize() {
  if (chart) {
    chart.resize()
    render()
  }
}

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})

watch(
  () => props.suppliers,
  () => render(),
  { deep: true }
)
</script>

<template>
  <div class="map-card">
    <div class="map-head">
      <span class="map-title">美国资源地图</span>
      <span class="map-sub">节点大小随该城市供应商数量变化，点击节点查看供应商</span>
    </div>
    <div class="map-body">
      <div ref="chartRef" class="map-canvas"></div>
      <div class="map-zoom">
        <el-button size="small" circle @click="zoomIn">+</el-button>
        <el-button size="small" circle @click="zoomOut">−</el-button>
      </div>
    </div>

    <el-collapse v-model="legendOpen" class="map-legend">
      <el-collapse-item name="legend">
        <template #title>
          <span class="legend-title">地图划分规则</span>
        </template>
        <p class="legend-text">
          本资源盘参考 UPS、FedEx 等美国主流物流体系，以 ZIP Code 前三位（ZIP3）进行区域识别和运输网络划分，结合美国主要港口、核心城市群、物流经济圈及我司实际尾端资源调度场景，对美国资源统一分区。区域判定原则：优先识别美湾 → 按东西部主要物流带划分美东、美西 → 其余内陆节点归入美中；边界城市结合 ZIP3、核心物流枢纽及实际辐射方向确定归属。
        </p>
        <div class="legend-regions">
          <div v-for="g in regionGroups" :key="g.name" class="legend-region">
            <span class="legend-region-name">{{ g.name }}</span>
            <span class="legend-region-nodes">{{ g.nodes }}</span>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>

    <el-drawer v-model="nodeDrawer" :title="activeNode?.name || '资源节点'" size="420px" append-to-body>
      <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px">
        供应商数量：{{ activeNode?.count }} · 主要业务：{{ activeNode?.biz || '—' }}
      </p>
      <el-table :data="activeNode?.suppliers || []" size="small" @row-click="(row) => emit('open', row)" style="cursor: pointer">
        <el-table-column prop="name" label="供应商名称" min-width="160">
          <template #default="{ row }"><el-link type="primary" :underline="false">{{ row.name }}</el-link></template>
        </el-table-column>
        <el-table-column prop="status" label="合作状态" width="90">
          <template #default="{ row }">
            <el-tag :type="{ 使用中: 'success', 储备: 'warning', 暂停合作: 'danger', 已淘汰: 'info' }[row.status] || 'info'" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-drawer>
  </div>
</template>

<style scoped>
.map-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 16px;
}
.map-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 8px;
}
.map-title {
  color: #1f2937;
  font-size: 15px;
  font-weight: 600;
}
.map-sub {
  color: #6b7280;
  font-size: 12px;
}
.map-canvas {
  width: 100%;
  height: calc(100vh - 420px);
  min-height: 360px;
}
.map-body {
  position: relative;
}
.map-zoom {
  position: absolute;
  right: 14px;
  bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.map-legend {
  margin-top: 10px;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
.map-legend :deep(.el-collapse-item__header) {
  background: transparent;
  color: #6b7280;
  border: none;
  padding: 0 12px;
}
.map-legend :deep(.el-collapse-item__wrap) {
  background: transparent;
  border: none;
}
.map-legend :deep(.el-collapse-item__content) {
  padding: 0 12px 12px;
}
.legend-title {
  font-size: 13px;
  color: #6b7280;
}
.legend-text {
  color: #6b7280;
  font-size: 11px;
  line-height: 1.7;
  margin: 4px 0 10px;
}
.legend-regions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 24px;
}
.legend-region {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 11px;
}
.legend-region-name {
  color: #2563eb;
  white-space: nowrap;
  font-weight: 600;
  flex-shrink: 0;
  width: 40px;
}
.legend-region-nodes {
  color: #6b7280;
  line-height: 1.6;
  font-size: 11px;
}
</style>
