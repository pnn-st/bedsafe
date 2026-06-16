'use client'

import { useState, useEffect } from 'react'
import type { BedState } from '@/lib/types'
import { AlertCircle, User } from 'lucide-react'

interface BedCardProps {
  bed: BedState
  isSelected: boolean
  onClick: () => void
}

type UiStatus = 'occupied' | 'empty' | 'alert' | 'warning' | 'offline'

const STATUS_CONFIG: Record<UiStatus, {
  label: string
  colorClass: string
  bgClass: string
  borderClass: string
  badgeBg: string
}> = {
  occupied: {
    label: 'NORMAL',
    colorClass: 'text-occupied',
    bgClass: 'bg-occupied-bg',
    borderClass: 'border-occupied-border',
    badgeBg: 'bg-occupied'
  },
  empty: {
    label: 'EMPTY',
    colorClass: 'text-empty',
    bgClass: 'bg-empty-bg',
    borderClass: 'border-empty-border',
    badgeBg: 'bg-empty'
  },
  alert: {
    label: 'ALERT',
    colorClass: 'text-alert',
    bgClass: 'bg-alert-bg',
    borderClass: 'border-alert-border',
    badgeBg: 'bg-alert'
  },
  warning: {
    label: 'WARNING',
    colorClass: 'text-yellow-600',
    bgClass: 'bg-yellow-50',
    borderClass: 'border-yellow-400',
    badgeBg: 'bg-yellow-500'
  },
  offline: {
    label: 'OFFLINE',
    colorClass: 'text-offline',
    bgClass: 'bg-offline-bg',
    borderClass: 'border-offline-border',
    badgeBg: 'bg-offline'
  },
}

function getUiStatus(bed: BedState): UiStatus {
  if (bed.deviceStatus === 'offline') return 'offline'
  if (bed.alert) return 'alert'
  if (bed.warning) return 'warning'
  if (bed.patientId) return 'occupied'
  return 'empty'
}

export default function BedCard({ bed, isSelected, onClick }: BedCardProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const status = getUiStatus(bed)
  const cfg = STATUS_CONFIG[status]
  const isAlert = status === 'alert'
  const isWarning = status === 'warning'

  const formattedTime = mounted && bed.updatedAt
    ? new Date(bed.updatedAt).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    : '--:--:--'

  const isMonitoringPaused = bed.patientId && !bed.isMonitoringActive
  const badgeLabel = isMonitoringPaused ? 'PAUSED' : cfg.label
  const badgeBgClass = isMonitoringPaused
    ? 'bg-yellow-50 border-yellow-200 text-yellow-600'
    : `${cfg.bgClass} border ${cfg.borderClass} ${cfg.colorClass}`
  const badgeIndicatorColor = isMonitoringPaused ? 'bg-yellow-500' : cfg.badgeBg

  return (
    <div
      onClick={onClick}
      className={`bg-surface border-2 ${
        isSelected
          ? 'border-primary shadow-[0_0_0_4px_rgba(59,130,246,0.1)]'
          : isMonitoringPaused
          ? 'border-yellow-300 bg-yellow-50/10 shadow-sm'
          : `${cfg.borderClass} shadow-sm`
      } rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] relative flex flex-col justify-between h-full min-h-[180px] ${isAlert ? 'animate-alert-border' : ''} ${isWarning ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]' : ''}`}
    >
      {/* Top Section */}
      <div className="flex justify-between items-start">
        <div className={`text-[32px] font-extrabold ${isMonitoringPaused ? 'text-yellow-600' : cfg.colorClass} leading-none tracking-[-1px]`}>
          {bed.bedName}
        </div>
 
        {/* Status Badge */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${badgeBgClass} text-[10px] font-extrabold tracking-[0.5px] uppercase`}>
          <span className={`w-1.5 h-1.5 rounded-full ${badgeIndicatorColor} shadow-[0_0_6px] ${isAlert ? 'animate-[pulse-border_1s_infinite]' : ''}`} />
          {badgeLabel}
        </div>
      </div>
 
      {/* Alert Indicator */}
      <div className="my-4 relative h-6 flex items-center justify-end">
        {isAlert && bed.alertTime && mounted && (
          <div className="text-alert flex items-center gap-1 text-xs font-bold animate-pulse">
            <AlertCircle size={14} />
            Since {new Date(bed.alertTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
        {isWarning && bed.alertTime && mounted && (
          <div className="text-yellow-600 flex items-center gap-1 text-xs font-bold">
            <AlertCircle size={14} />
            Warning: Sitting Up
          </div>
        )}
        {isMonitoringPaused && mounted && !isAlert && !isWarning && (
          <div className="text-yellow-600 flex items-center gap-1 text-[11px] font-bold">
            ⚠️ ตรวจจับผู้ป่วยลุกปิดอยู่
          </div>
        )}
      </div>
 
      {/* Bottom Section: Patient Info */}
      <div className="bg-surface-2 rounded-xl p-2.5 mt-auto">
        {bed.patientId ? (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-border flex items-center justify-center text-text-secondary shrink-0">
              <User size={14} strokeWidth={2.5} />
            </div>
            <div className="overflow-hidden">
              <div className="text-[10px] text-text-secondary font-semibold uppercase mb-0.5">
                ID: {bed.patientId}
              </div>
              <div className="text-[13px] text-text-primary font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                {bed.patientName}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-text-tertiary font-medium text-center py-1 flex items-center justify-center gap-2">
            No Patient
          </div>
        )}
      </div>
 
      {/* Timestamp */}
      <div className="text-[10px] text-text-tertiary font-medium text-right mt-2">
        UPDATED: {formattedTime}
      </div>
    </div>
  )
}
