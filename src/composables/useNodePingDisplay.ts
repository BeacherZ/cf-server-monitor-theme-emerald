import type { MaybeRefOrGetter } from 'vue'
import type { NodeStatusPing } from '@/utils/rpc'
import { computed, toValue } from 'vue'
import { NODE_PING_BAR_COUNT, useNodePingStats } from '@/composables/useNodePingStats'
import { useNodesStore } from '@/stores/nodes'
import { formatDateTime } from '@/utils/helper'
import { getPingToneClass, PING_PROVIDERS } from '@/utils/nodeHelper'

export type NodePingMetric = 'latency' | 'loss'

export interface NodePingBar {
  key: string
  className: string
  tooltip: string
}

interface UseNodePingDisplayOptions {
  enabled?: MaybeRefOrGetter<boolean>
  /** 本机当前生效的 ping 目标数，用于在 tooltip 标注平均口径 */
  targetCount?: MaybeRefOrGetter<number>
  loadingDisplayText?: string
  emptyDisplayText?: string
  loadingPanelTooltipText?: Partial<Record<NodePingMetric, string>>
  emptyPanelTooltipText?: Partial<Record<NodePingMetric, string>>
}

function getLatencyToneClass(latency: number): string {
  if (latency <= 60)
    return 'bg-emerald-600/90'
  if (latency <= 120)
    return 'bg-green-500/80'
  if (latency <= 180)
    return 'bg-lime-400/80'
  if (latency <= 240)
    return 'bg-yellow-400/80'
  return 'bg-rose-500/80'
}

function getLossToneClass(loss: number): string {
  if (loss <= 1)
    return 'bg-emerald-600/90'
  if (loss <= 3)
    return 'bg-green-500/80'
  if (loss <= 6)
    return 'bg-lime-400/80'
  if (loss <= 9)
    return 'bg-yellow-400/80'
  return 'bg-rose-500/80'
}

export interface TopPingNetwork {
  key: string
  name: string
  latency: string
  toneClass: string
  tooltip: string
}

/**
 * 首页卡片/列表「三网」行：只取 CT/CU/CM（前 3 个），并按存在性过滤；
 * ping_x / loss_x 皆不存在时不会进入 ping map，对应项不展示。
 */
export function buildTopPingNetworks(ping?: Record<string, NodeStatusPing>): TopPingNetwork[] {
  if (!ping)
    return []

  return PING_PROVIDERS.slice(0, 3).flatMap((provider) => {
    const entry = ping[provider.key]
    if (!entry)
      return []

    const latency = entry.latest ?? 0
    const loss = entry.loss ?? 100
    const available = latency > 0 && loss < 100

    return [{
      key: provider.key,
      name: entry.name ?? provider.label,
      latency: available ? `${Math.round(latency)}ms` : '--',
      toneClass: getPingToneClass(latency, available),
      tooltip: available
        ? `${entry.name ?? provider.label}\n${Math.round(latency)} ms`
        : `${entry.name ?? provider.label}\n暂无响应`,
    }]
  })
}

export function useNodePingDisplay(
  uuid: MaybeRefOrGetter<string>,
  options: UseNodePingDisplayOptions = {},
) {
  // Home-card samples are appended by the shared subscribe=all WebSocket.
  const pingStatsEnabled = computed(() => options.enabled === undefined || toValue(options.enabled))

  const pingStats = useNodePingStats(uuid, {
    enabled: pingStatsEnabled,
  })

  const nodesStore = useNodesStore()

  /**
   * 把历史按固定的 NODE_PING_BAR_COUNT 个时间格铺满整个窗口（默认 1 小时），
   * 以最后一个采样点为锚点向左切分。格数恒定，不随采样点数量变化；
   * 尚无数据的格子显示为浅灰占位，随时间自然被填充。
   */
  function buildPingBars(metric: NodePingMetric): NodePingBar[] {
    const points = pingStats.history.value
    if (!points.length)
      return []

    const barCount = NODE_PING_BAR_COUNT
    const spanMs = nodesStore.pingHistorySpanMs
    const slotMs = Math.max(1, Math.round(spanMs / barCount))
    const lastTime = Date.parse(points.at(-1)!.time)
    if (!Number.isFinite(lastTime))
      return []

    const endTime = lastTime + slotMs
    const startTime = endTime - spanMs

    const bars: NodePingBar[] = []
    for (let index = 0; index < barCount; index++) {
      const segmentStart = startTime + index * slotMs
      const segmentEnd = segmentStart + slotMs
      const segmentPoints = points.filter((point) => {
        const time = Date.parse(point.time)
        return time >= segmentStart && time < segmentEnd
      })

      const latencyValues = segmentPoints
        .map(point => point.latency)
        .filter((value): value is number => value !== null)
      const lossValues = segmentPoints
        .map(point => point.loss)
        .filter((value): value is number => value !== null)

      const value = metric === 'latency'
        ? latencyValues.length
          ? latencyValues.reduce((sum, v) => sum + v, 0) / latencyValues.length
          : null
        : lossValues.length
          ? lossValues.reduce((sum, v) => sum + v, 0) / lossValues.length
          : null
      const segmentTime = new Date(segmentStart).toISOString()

      bars.push({
        key: `${segmentTime}-${index}`,
        className: value === null
          ? 'bg-muted-foreground/15'
          : metric === 'latency'
            ? getLatencyToneClass(value)
            : getLossToneClass(value),
        tooltip: value === null
          ? `${formatDateTime(segmentTime, 'HH:mm')}–${formatDateTime(new Date(segmentEnd).toISOString(), 'HH:mm')}\n无数据`
          : metric === 'latency'
            ? `${formatDateTime(segmentTime, 'HH:mm')}\n${Math.round(value)} ms`
            : `${formatDateTime(segmentTime, 'HH:mm')}\n${value.toFixed(1)}%`,
      })
    }

    return bars
  }

  function buildEmptyPingBars(metric: NodePingMetric): NodePingBar[] {
    const tooltip = pingStats.loading.value
      ? '加载中'
      : pingStats.error.value
        ? '加载失败'
        : !pingStatsEnabled.value
            ? '未启用记录'
            : metric === 'latency'
              ? 'N/A'
              : 'N/A'

    return Array.from({ length: NODE_PING_BAR_COUNT }, (_, index) => ({
      key: `${metric}-empty-${index}`,
      className: 'bg-muted-foreground/10',
      tooltip,
    }))
  }

  const latencyBars = computed(() => buildPingBars('latency'))
  const lossBars = computed(() => buildPingBars('loss'))
  const latencyRenderBars = computed(() => latencyBars.value.length ? latencyBars.value : buildEmptyPingBars('latency'))
  const lossRenderBars = computed(() => lossBars.value.length ? lossBars.value : buildEmptyPingBars('loss'))

  const latencyDisplay = computed(() => {
    if (pingStats.hasData.value)
      return `${Math.round(pingStats.avgLatency.value)} ms`
    if (pingStats.loading.value)
      return options.loadingDisplayText ?? '加载中'
    return options.emptyDisplayText ?? '-'
  })

  const lossDisplay = computed(() => {
    if (pingStats.hasData.value)
      return `${pingStats.avgLoss.value.toFixed(1)}%`
    if (pingStats.loading.value)
      return options.loadingDisplayText ?? '加载中'
    return options.emptyDisplayText ?? '-'
  })

  // tooltip 后缀：标明本次平均用了几条 ping 线路
  const targetCountSuffix = computed(() => {
    if (options.targetCount === undefined)
      return ''
    const count = toValue(options.targetCount)
    return count > 1 ? ` · ${count} 个目标` : ''
  })

  const latencyPanelTooltip = computed(() => {
    if (!pingStats.hasData.value) {
      if (pingStats.loading.value)
        return options.loadingPanelTooltipText?.latency ?? ''
      return options.emptyPanelTooltipText?.latency ?? ''
    }
    return `平均延迟 ${Math.round(pingStats.avgLatency.value)} ms${targetCountSuffix.value}`
  })

  const lossPanelTooltip = computed(() => {
    if (!pingStats.hasData.value) {
      if (pingStats.loading.value)
        return options.loadingPanelTooltipText?.loss ?? ''
      return options.emptyPanelTooltipText?.loss ?? ''
    }

    const volatility = pingStats.avgVolatility.value > 0
      ? `，平均波动 ${pingStats.avgVolatility.value.toFixed(2)}`
      : ''
    return `平均丢包 ${pingStats.avgLoss.value.toFixed(1)}%${volatility}${targetCountSuffix.value}`
  })

  return {
    pingStats,
    pingStatsEnabled,
    latencyRenderBars,
    lossRenderBars,
    latencyDisplay,
    lossDisplay,
    latencyPanelTooltip,
    lossPanelTooltip,
  }
}
