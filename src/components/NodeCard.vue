<script setup lang="ts">
import type { NodeData } from '@/stores/nodes'
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { CardX } from '@/components/ui/card-x'
import { DataTooltip } from '@/components/ui/data-tooltip'
import { ProgressThin } from '@/components/ui/progress-thin'
import { useBackgroundSurface } from '@/composables/useBackgroundSurface'
import { buildTopPingNetworks, useNodePingDisplay } from '@/composables/useNodePingDisplay'
import { useAppStore } from '@/stores/app'
import { useNodesStore } from '@/stores/nodes'
import { getApiAssetUrl } from '@/utils/api'
import { formatBytesPerSecondWithConfig, formatBytesWithConfig, formatDateTime, formatUptimeWithFormat, getStatus } from '@/utils/helper'
import { formatOfflineTime, getCustomTags, getPriceTags, getRemainingTimeTagClass, getTrafficLevel, getTrafficUsed, getTrafficUsedPercentage, hasRegion, showTrafficProgress } from '@/utils/nodeHelper'
import { hasIPv4, hasIPv6 } from '@/utils/tagHelper'
import { getOSImage, getOSName } from '@/utils/osImageHelper'
import { getRegionCode, getRegionDisplayName } from '@/utils/regionHelper'

const props = defineProps<{ node: NodeData }>()

const emit = defineEmits<{
  click: []
  pingClick: [node: NodeData]
}>()

const appStore = useAppStore()
const nodesStore = useNodesStore()
const { pickSurfaceClass } = useBackgroundSurface()

const formatBytes = (bytes: number) => formatBytesWithConfig(bytes, appStore.byteDecimals)
const formatBytesPerSecond = (bytes: number) => formatBytesPerSecondWithConfig(bytes, appStore.byteDecimals)
const formatUptime = (seconds: number) => formatUptimeWithFormat(seconds, 'hour')
const offlineTime = computed(() => formatOfflineTime(props.node))
const expiredDate = computed(() => formatDateTime(props.node.expired_at, 'YYYY-MM-DD'))

const cpuStatus = computed(() => getStatus(props.node.cpu ?? 0))
const memPercentage = computed(() => (props.node.ram ?? 0) / (props.node.mem_total || 1) * 100)
const memStatus = computed(() => getStatus(memPercentage.value))
const diskPercentage = computed(() => (props.node.disk ?? 0) / (props.node.disk_total || 1) * 100)
const diskStatus = computed(() => getStatus(diskPercentage.value))

const trafficUsedPercentage = computed(() => getTrafficUsedPercentage(props.node))
const trafficStatus = computed(() => getTrafficLevel(trafficUsedPercentage.value))
const trafficUsed = computed(() => getTrafficUsed(props.node))
// show_price 关闭时访客不可见价格，仅保留剩余时间（管理员不受影响）
const canViewPrice = computed(() => appStore.canViewPrice)
const priceTags = computed(() => getPriceTags(props.node, appStore.lang, canViewPrice.value))
const remainingTimeTagClass = computed(() => getRemainingTimeTagClass(props.node))
const customTags = computed(() => getCustomTags(props.node))
// 实例支持的协议栈：只显示探针实际上报了的地址族
const ipStackBadges = computed(() => {
  const badges: string[] = []
  if (hasIPv4(props.node.ipv4))
    badges.push('V4')
  if (hasIPv6(props.node.ipv6))
    badges.push('V6')
  return badges
})

const {
  latencyRenderBars,
  lossRenderBars,
  latencyDisplay,
  lossDisplay,
  latencyPanelTooltip,
  lossPanelTooltip,
} = useNodePingDisplay(props.node.uuid)
const topPingNetworks = computed(() => buildTopPingNetworks(props.node.ping))

// 数值只在「出问题」时上色：正常用正文色，靠字重区分层级；
// 绿色留给进度条、三网、方块这些真正需要看颜色的地方。
function statusTextClass(status: 'success' | 'warning' | 'error') {
  switch (status) {
    case 'success': return 'text-foreground'
    case 'warning': return 'text-amber-600 dark:text-amber-400'
    default: return 'text-red-600 dark:text-red-400'
  }
}

function openPingDialog() {
  emit('pingClick', props.node)
}
</script>

<template>
  <CardX
    hoverable
    class="node-card h-full w-full cursor-pointer border-none shadow-[0_0_20px] shadow-emerald-600/10 transition-all duration-200 rounded-md bg-background/80 hover:bg-background hover:shadow-emerald-600/10 hover:shadow-[0_0_20px,0_0_0_1px] hover:-translate-y-0.5 hover:z-1"
    :class="[pickSurfaceClass('', 'backdrop-blur-sm'), !props.node.online && '!shadow-[0_0_20px] !shadow-red-600/15']"
    @click="emit('click')"
  >
    <template #header>
      <div class="flex gap-2 min-w-0 items-center">
        <div class="size-2 rounded-full relative" :class="[props.node.online ? 'bg-emerald-600' : 'bg-red-600']">
          <div
            class="animate-ping absolute inset-0 rounded-full opacity-50"
            :class="[props.node.online ? 'bg-emerald-600' : 'bg-red-600']"
          />
        </div>
        <div class="text-md font-bold flex-1 min-w-0 truncate">
          {{ props.node.name }}
        </div>
      </div>
    </template>

    <template #header-extra>
      <div class="flex gap-2 items-center">
        <img :src="getOSImage(props.node.os, props.node.source_index)" :alt="getOSName(props.node.os)" class="size-4">
        <img
          v-if="hasRegion(props.node.region)" :src="getApiAssetUrl(`flags/${getRegionCode(props.node.region).toLowerCase()}.svg`, props.node.source_index)"
          :alt="getRegionDisplayName(props.node.region)" class="size-5 shrink-0 rounded-sm drop-shadow-[0_0_2px_rgba(0,0,0,0.1)]"
        >
      </div>
    </template>

    <template #default>
      <div class="flex flex-col gap-3">
        <div class="gap-x-3 gap-y-1 grid grid-cols-2">
          <!-- CPU -->
          <div class="flex flex-col gap-1">
            <div class="w-full text-xs flex flex-row justify-between">
              <span class="text-muted-foreground">
                CPU
              </span>
              <span class="font-medium tabular-nums" :class="statusTextClass(cpuStatus)">{{ (props.node.cpu ?? 0).toFixed(1) }}%</span>
            </div>
            <ProgressThin :percentage="props.node.cpu ?? 0" :status="cpuStatus" :height="4" />
            <div class="text-[11px] text-muted-foreground truncate">
              {{ props.node.load.toFixed(2) ?? 0 }}, {{ props.node.load5.toFixed(2) ?? 0 }}, {{
                props.node.load15.toFixed(2) ?? 0 }}
            </div>
          </div>

          <!-- 内存 -->
          <div class="flex flex-col gap-1">
            <div class="w-full text-xs flex flex-row justify-between">
              <span class="text-muted-foreground">
                内存
              </span>
              <span class="font-medium tabular-nums" :class="statusTextClass(memStatus)">{{ memPercentage.toFixed(1) }}%</span>
            </div>
            <ProgressThin :percentage="memPercentage" :status="memStatus" :height="4" />
            <DataTooltip placement="top" class="block" :content-class="[!props.node.swap && '!hidden']">
              <div class="text-[11px] text-muted-foreground truncate">
                {{ formatBytes(props.node.ram ?? 0) }} / {{ formatBytes(props.node.mem_total ?? 0) }}
              </div>
              <template #content>
                <div class="flex items-center justify-between gap-3 whitespace-nowrap">
                  <span class="text-background/70">Swap</span>
                  <span>{{ formatBytes(props.node.swap ?? 0) }}</span>
                </div>
              </template>
            </DataTooltip>
          </div>

          <!-- 硬盘 -->
          <div class="flex flex-col gap-1">
            <div class="w-full text-xs flex flex-row justify-between">
              <span class="text-muted-foreground">
                硬盘
              </span>
              <span class="font-medium tabular-nums" :class="statusTextClass(diskStatus)">{{ diskPercentage.toFixed(1) }}%</span>
            </div>
            <ProgressThin :percentage="diskPercentage" :status="diskStatus" :height="4" />
            <div class="text-[11px] text-muted-foreground truncate">
              {{ formatBytes(props.node.disk ?? 0) }} / {{ formatBytes(props.node.disk_total ?? 0) }}
            </div>
          </div>

          <!-- 流量进度条 -->
          <div class="flex flex-col gap-1">
            <div class="w-full text-xs flex flex-row justify-between">
              <span class="text-muted-foreground">
                流量
              </span>
              <span class="font-medium tabular-nums" :class="statusTextClass(trafficStatus)">{{ trafficUsedPercentage.toFixed(1) }}%</span>
            </div>
            <ProgressThin :percentage="trafficUsedPercentage" :status="trafficStatus" :height="4" />
            <DataTooltip placement="top" class="block">
              <div class="text-[11px] text-muted-foreground truncate">
                {{ formatBytes(trafficUsed) }} /
                <template v-if="showTrafficProgress(node)">
                  {{ formatBytes(props.node.traffic_limit) }}
                </template>
                <template v-else>
                  ∞
                </template>
              </div>
              <template #content>
                <div class="flex items-center justify-between gap-3 whitespace-nowrap">
                  <div class="text-[11px] flex flex-col">
                    <div class="flex flex-row items-center gap-1">
                      <Icon icon="tabler:chevron-up" width="12" height="12" />
                      {{ formatBytes(props.node.net_monthly_up ?? 0) }}
                    </div>
                    <div class="flex flex-row items-center gap-1">
                      <Icon icon="tabler:chevron-down" width="12" height="12" />
                      {{ formatBytes(props.node.net_monthly_down ?? 0) }}
                    </div>
                  </div>
                </div>
              </template>
            </DataTooltip>
          </div>
        </div>
        <div class="relative text-[11px] text-muted-foreground">
          <div
            v-if="!props.node.online"
            class="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-1"
          >
            <span class="text-sm text-red-600">离线</span>
            <div>{{ offlineTime }}</div>
          </div>
          <div class="flex flex-col gap-y-2" :class="[!props.node.online && 'blur-xs opacity-60 pointer-events-none']">
            <div class="flex items-center">
              <span class="truncate">
                速率
              </span>
              <div class="border-t-2 border-dotted border-gray-500/10 mx-2 flex-1" />
              <div class="truncate flex flex-row gap-1">
                <div class="text-green-600 flex flex-row items-center gap-1">
                  <Icon icon="tabler:chevron-up" width="12" height="12" />
                  {{ formatBytesPerSecond(props.node.net_out ?? 0) }}
                </div>
                <div class="text-blue-600 flex flex-row items-center gap-1">
                  <Icon icon="tabler:chevron-down" width="12" height="12" />
                  {{ formatBytesPerSecond(props.node.net_in ?? 0) }}
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <span class="truncate">
                在线
              </span>
              <div class="border-t-2 border-dotted border-gray-500/10 mx-2 flex-1" />
              <span class="truncate">
                {{ props.node.uptime > 0 ? formatUptime(props.node.uptime) : '' }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="truncate">
                费用
              </span>
              <div class="border-t-2 border-dotted border-gray-500/10 mx-2 flex-1" />
              <DataTooltip placement="left" :content="expiredDate" content-class="whitespace-nowrap right-0 mr-0">
                <span class="truncate flex flex-row gap-1">
                  <template v-for="(tag, index) in priceTags" :key="tag">
                    <span class="inline-flex flex-row gap-1 items-center">
                      <template v-if="tag.highlightValue">
                        <span>{{ tag.prefix }}</span>
                        <span :class="remainingTimeTagClass">{{ tag.highlightValue }}</span>
                        <span>{{ tag.suffix }}</span>
                      </template>
                      <template v-else>
                        {{ tag.text }}
                      </template>
                    </span>
                    <span v-if="index < priceTags.length - 1" :key="`${tag}-${index}`">·</span>
                  </template>
                </span>
              </DataTooltip>
            </div>
            <div class="flex items-center justify-between">
              <span class="truncate">
                三网
              </span>
              <div class="border-t-2 border-dotted border-gray-500/10 mx-2 flex-1" />
              <div v-if="topPingNetworks.length > 0" class="flex flex-row">
                <DataTooltip
                  v-for="(net, index) in topPingNetworks" :key="net.key" placement="top"
                  :content="net.tooltip"
                  content-class="whitespace-pre-wrap w-max px-1.5 !leading-[1.2] text-[11px]"
                >
                  <div class="truncate">
                    <span v-if="index" class="mx-1">·</span>
                    <span :class="net.toneClass">{{ net.latency }}</span>
                  </div>
                </DataTooltip>
              </div>
              <div v-else class="truncate">
                N/A
              </div>
            </div>
            <template v-if="nodesStore.showThreeNetDetails">
              <div class="grid grid-cols-6 gap-x-3">
                <div
                  role="button" tabindex="0"
                  class="group/panel relative col-span-3 flex h-6 cursor-pointer flex-col gap-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  :title="latencyPanelTooltip" :aria-label="`${props.node.name} 延迟`"
                  @click.stop="openPingDialog"
                  @keydown.enter.stop.prevent="openPingDialog"
                  @keydown.space.stop.prevent="openPingDialog"
                >
                  <div class="flex items-center justify-between text-[11px] leading-none relative">
                    <span class="text-muted-foreground">延迟</span>
                    <div class="border-t-2 border-dotted border-gray-500/10 mx-2 flex-1" />
                    <span class="font-medium text-foreground/85">{{ latencyDisplay }}</span>
                  </div>
                  <div
                    class="grid h-full items-end gap-[1px]"
                    :style="{ gridTemplateColumns: `repeat(${latencyRenderBars.length}, minmax(0, 1fr))` }"
                  >
                    <DataTooltip
                      v-for="bar in latencyRenderBars" :key="bar.key" placement="top"
                      :content="bar.tooltip" class="h-full w-full"
                      content-class="whitespace-pre-wrap w-max px-1.5 !leading-[1.2] text-[11px]"
                    >
                      <span
                        class="block h-full w-full rounded-[1px] transition-transform duration-150 group-hover/data-tooltip:scale-y-200"
                        :class="bar.className"
                      />
                    </DataTooltip>
                  </div>
                </div>
                <div
                  role="button" tabindex="0"
                  class="group/panel relative col-span-3 flex h-6 cursor-pointer flex-col gap-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  :title="lossPanelTooltip" :aria-label="`${props.node.name} 丢包`"
                  @click.stop="openPingDialog"
                  @keydown.enter.stop.prevent="openPingDialog"
                  @keydown.space.stop.prevent="openPingDialog"
                >
                  <div class="flex items-center justify-between text-[11px] leading-none relative">
                    <span class="text-muted-foreground">丢包</span>
                    <div class="border-t-2 border-dotted border-gray-500/10 mx-2 flex-1" />
                    <span class="font-medium text-foreground/85">{{ lossDisplay }}</span>
                  </div>
                  <div
                    class="grid h-full items-end gap-[1px]"
                    :style="{ gridTemplateColumns: `repeat(${lossRenderBars.length}, minmax(0, 1fr))` }"
                  >
                    <DataTooltip
                      v-for="bar in lossRenderBars" :key="bar.key" placement="top"
                      :content="bar.tooltip" class="h-full w-full"
                      content-class="whitespace-pre-wrap w-max px-1.5 !leading-[1.2] text-[11px]"
                    >
                      <span
                        class="block h-full w-full rounded-[1px] transition-transform duration-150 group-hover/data-tooltip:scale-y-200"
                        :class="bar.className"
                      />
                    </DataTooltip>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
        <div
          v-if="customTags.length > 0 || ipStackBadges.length > 0"
          class="flex shrink-0 items-center justify-between gap-2"
        >
          <div class="min-w-0 flex flex-wrap gap-1 items-center">
            <Badge
              v-for="(tag, index) in customTags" :key="index" variant="outline"
              class="!text-[11px] rounded border-transparent px-1.5 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
            >
              {{ tag }}
            </Badge>
          </div>
          <div v-if="ipStackBadges.length > 0" class="shrink-0 flex gap-1 items-center">
            <Badge
              v-for="badge in ipStackBadges" :key="badge" variant="outline"
              class="!text-[11px] rounded border-transparent px-1.5 tabular-nums"
              :class="badge === 'V4'
                ? 'bg-blue-600/10 text-blue-700 dark:text-blue-400'
                : 'bg-violet-600/10 text-violet-700 dark:text-violet-400'"
            >
              {{ badge }}
            </Badge>
          </div>
        </div>
      </div>
    </template>
  </CardX>
</template>

<style scoped>
.node-card {
  position: relative;
  overflow: hidden;
}
</style>
