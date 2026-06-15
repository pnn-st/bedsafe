'use client'

import type { DashboardSummary } from '@/lib/types'
import { BedDouble, Wifi, Users, BellRing } from 'lucide-react'

interface StatCardsProps {
  summary: DashboardSummary
}

interface CardConfig {
  icon: React.ReactNode
  label: string
  value: string | number
  sub: string
  colorClass: string
  bgClass: string
  borderClass: string
  accentClass: string
  hideAccent?: boolean
}

export default function StatCards({ summary }: StatCardsProps) {
  const cards: CardConfig[] = [
    {
      icon: <BedDouble size={24} strokeWidth={2} />,
      label: 'เตียงทั้งหมด',
      value: summary.totalBeds,
      sub: 'Beds',
      colorClass: 'text-primary-dark',
      bgClass: 'bg-empty-bg',
      borderClass: 'border-empty-border',
      accentClass: 'bg-primary-dark'
    },
    {
      icon: <Wifi size={24} strokeWidth={2.5} />,
      label: 'อุปกรณ์ Online',
      value: summary.devicesOnline,
      sub: 'Devices',
      colorClass: 'text-occupied',
      bgClass: 'bg-occupied-bg',
      borderClass: 'border-occupied-border',
      accentClass: 'bg-occupied'
    },
    {
      icon: <Users size={24} strokeWidth={2} />,
      label: 'เตียงมีผู้ป่วย',
      value: summary.occupiedBeds,
      sub: 'Occupied',
      colorClass: 'text-[#0369a1]',
      bgClass: 'bg-[#f0f9ff]',
      borderClass: 'border-[#bae6fd]',
      accentClass: 'bg-[#0369a1]'
    },
    {
      icon: <BellRing size={24} strokeWidth={2.5} className={summary.activeAlerts > 0 ? "animate-pulse" : ""} />,
      label: 'แจ้งเตือน',
      value: summary.activeAlerts,
      sub: 'Alerts',
      colorClass: summary.activeAlerts > 0 ? 'text-alert' : 'text-offline',
      bgClass: summary.activeAlerts > 0 ? 'bg-alert-bg' : 'bg-offline-bg',
      borderClass: summary.activeAlerts > 0 ? 'border-alert-border' : 'border-offline-border',
      accentClass: summary.activeAlerts > 0 ? 'bg-alert' : 'bg-offline',
      hideAccent: summary.activeAlerts === 0
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-5">
      {cards.map((card, i) => (
        <div
          key={i}
          className="bg-surface border border-border rounded-2xl p-6 flex items-center gap-5 shadow-sm transition-all duration-300 relative overflow-hidden group hover:shadow-md"
        >
          {/* Subtle Accent Line */}
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${card.accentClass} ${card.hideAccent ? 'opacity-0' : 'opacity-80 group-hover:opacity-100 transition-opacity'}`} />

          {/* Icon Badge */}
          <div className={`w-14 h-14 rounded-xl ${card.bgClass} border ${card.borderClass} flex items-center justify-center ${card.colorClass} shrink-0`}>
            {card.icon}
          </div>

          {/* Text */}
          <div className="flex-1">
            <div className="text-[13px] text-text-secondary mb-1 font-semibold uppercase tracking-[0.5px]">
              {card.label}
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-extrabold ${card.colorClass} leading-none tabular-nums tracking-[-1px]`}>
                {card.value}
              </span>
              <span className="text-[13px] text-text-tertiary font-semibold">
                {card.sub}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
