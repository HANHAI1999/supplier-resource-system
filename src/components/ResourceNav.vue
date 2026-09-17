<script setup>
import { computed } from 'vue'
import { useStore } from '../store'
import { views } from '../data/mockAccounts'

const props = defineProps({
  currentAccountId: String,
  currentViewId: String,
})
const emit = defineEmits(['select-view'])

const store = useStore()
const account = computed(() => store.accounts.find((a) => a.id === props.currentAccountId) || store.accounts[0])
const cnViews = computed(() => views.filter((v) => v.group === 'cn' && account.value.views.includes(v.id)))
const usViews = computed(() => views.filter((v) => v.group === 'us' && account.value.views.includes(v.id)))
</script>

<template>
  <el-menu
    :default-active="currentViewId"
    background-color="transparent"
    text-color="#6b7280"
    active-text-color="#2563eb"
    @select="(v) => emit('select-view', v)"
  >
    <el-menu-item v-if="account.views.includes('res-map')" index="res-map">资源地图</el-menu-item>
    <el-menu-item v-for="v in cnViews" :key="v.id" :index="v.id">{{ v.name }}</el-menu-item>
    <el-sub-menu v-if="usViews.length" index="us">
      <template #title>美盈资源池</template>
      <el-menu-item v-for="v in usViews" :key="v.id" :index="v.id">{{ v.name }}</el-menu-item>
    </el-sub-menu>
    <el-menu-item v-if="account.canManage" index="perm">权限管理</el-menu-item>
  </el-menu>
</template>
