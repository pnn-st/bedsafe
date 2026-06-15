'use client'

import { useState, useEffect } from 'react'
import type { BedState } from '@/lib/types'
import { AlertCircle, User } from 'lucide-react'

interface BedCardProps {
  bed: BedState
  isSelected: boolean
  onClick: () => void
}

type UiStatus = 'occupied' | 'empty' | 'alert' | 'offline'

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
  if (bed.patientId) return 'occupied'
  return 'empty'
}

export default function BedCard({ bed, isSelected, onClick }: BedCardProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const status = getUiStatus(bed)
  const cfg = STATUS_CONFIG[status]
  const isAlert = status === 'alert'

  const formattedTime = mounted && bed.updatedAt
    ? new Date(bed.updatedAt).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--:--:--'

  return (
    <div
      onClick={onClick}
      className={`bg-surface border-2 ${isSelected ? 'border-primary shadow-[0_0_0_4px_rgba(59,130,246,0.1)]' : `${cfg.borderClass} shadow-sm`} rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] relative flex flex-col justify-between h-full min-h-[180px] ${isAlert ? 'animate-alert-border' : ''}`}
    >
      {/* Top Section */}
      <div className="flex justify-between items-start">
        <div className={`text-[32px] font-extrabold ${cfg.colorClass} leading-none tracking-[-1px]`}>
          {bed.bedName}
        </div>
        
        {/* Status Badge */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.bgClass} border ${cfg.borderClass} ${cfg.colorClass} text-[10px] font-extrabold tracking-[0.5px] uppercase`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.badgeBg} shadow-[0_0_6px] ${isAlert ? 'animate-[pulse-border_1s_infinite]' : ''}`} />
          {cfg.label}
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
