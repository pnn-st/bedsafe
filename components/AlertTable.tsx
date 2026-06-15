'use client'

import { useState, useEffect } from 'react'
import type { AlertHistory } from '@/lib/types'
import { BellRing, ChevronRight, ShieldAlert } from 'lucide-react'

interface AlertTableProps {
  events: AlertHistory[]
}

const STATUS_BADGE: Record<string, { label: string; bgClass: string; colorClass: string }> = {
  PATIENT_LEFT_BED: { label: 'PATIENT LEFT BED', bgClass: 'bg-alert-bg', colorClass: 'text-alert' },
  DEVICE_OFFLINE: { label: 'DEVICE OFFLINE', bgClass: 'bg-offline-bg', colorClass: 'text-offline' },
  ALERT_ACKNOWLEDGED: { label: 'ACKNOWLEDGED', bgClass: 'bg-occupied-bg', colorClass: 'text-occupied' },
}

export default function AlertTable({ events }: AlertTableProps) {
  const recentEvents = events.slice(0, 10)

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-2">
        <div className="flex items-center gap-2.5">
          <div className="text-alert"><BellRing size={18} strokeWidth={2.5} /></div>
          <span className="font-bold text-sm text-text-primary uppercase tracking-[0.5px]">
            การแจ้งเตือนล่าสุด
          </span>
        </div>
        <a href="/history" className="text-xs text-primary font-semibold no-underline flex items-center gap-1 hover:text-primary-dark transition-colors">
          ดูทั้งหมด <ChevronRight size={14} />
        </a>
      </div>

      {/* Table */}
      {recentEvents.length === 0 ? (
        <div className="p-10 text-center text-text-tertiary">
          <div className="mb-2 flex justify-center"><ShieldAlert size={32} strokeWidth={1.5} /></div>
          <div className="text-[13px] font-medium">ไม่มีประวัติการแจ้งเตือน</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface border-b border-border">
                {['เวลา', 'เตียง', 'ผู้ป่วย', 'เหตุการณ์', 'หมายเหตุ'].map((h) => (
                  <th key={h} className="px-5 py-3 text-[11px] font-semibold text-text-secondary uppercase tracking-[0.5px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((event, i) => {
                const badge = STATUS_BADGE[event.event] ?? { label: event.event, bgClass: 'bg-surface-2', colorClass: 'text-text-secondary' }
                const timeStr = mounted ? new Date(event.time).toLocaleTimeString('th-TH', {
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                }) : '--:--:--'
                
                return (
                  <tr
                    key={i}
                    className={`animate-fade-in ${i < recentEvents.length - 1 ? 'border-b border-border' : ''} ${event.event === 'PATIENT_LEFT_BED' ? 'bg-[#fff5f5]' : 'bg-transparent'} hover:bg-surface-2 transition-colors`}
                  >
                    <td className="px-4 py-2.5 text-[11px] text-text-muted whitespace-nowrap">
                      {timeStr}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-bold text-[13px] text-text-primary">
                        B{event.bedId}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-text-primary max-w-[150px] truncate">
                      {event.patientName || '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full ${badge.bgClass} ${badge.colorClass} text-[10px] font-bold whitespace-nowrap`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-text-secondary max-w-[200px] truncate">
                      {event.note}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
