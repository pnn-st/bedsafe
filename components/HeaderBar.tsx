'use client'

import { useState, useEffect } from 'react'
import { Activity, Clock, UserRound } from 'lucide-react'

interface HeaderBarProps {
  mqttConnected: boolean
  brokerUrl?: string
}

export default function HeaderBar({ mqttConnected, brokerUrl = 'localhost:1883' }: HeaderBarProps) {
  const [now, setNow] = useState(new Date())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeStr = mounted ? now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'
  const dateStr = mounted ? now.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) : 'กำลังโหลด...'

  return (
    <header className="bg-surface border-b border-border shadow-sm sticky top-0 z-50">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Logo + Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-light to-primary-dark flex items-center justify-center text-white shrink-0 shadow-[0_2px_4px_rgba(37,99,235,0.3)]">
            <Activity size={20} strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-bold text-base text-text-primary tracking-[-0.3px] leading-[1.2]">
              BedSafe
            </div>
            <div className="text-[11px] text-text-tertiary uppercase tracking-[0.5px] font-semibold">
              Bed Monitoring System
            </div>
          </div>
        </div>

        {/* Right side info */}
        <div className="flex items-center gap-6">
          {/* MQTT Status */}
          <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md border ${mqttConnected ? 'bg-occupied-bg border-occupied-border' : 'bg-alert-bg border-alert-border'}`}>
            <span className={`w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px] ${mqttConnected ? 'bg-occupied shadow-occupied' : 'bg-alert shadow-alert animate-[pulse-border_1.2s_ease-in-out_infinite]'}`} />
            <div>
              <div className={`text-[11px] uppercase tracking-[0.5px] font-bold ${mqttConnected ? 'text-occupied' : 'text-alert'}`}>
                {mqttConnected ? 'System Online' : 'System Offline'}
              </div>
              <div className="text-[10px] text-text-secondary font-medium">
                Broker: {brokerUrl}
              </div>
            </div>
          </div>

          <div className="w-px h-8 bg-border" />

          {/* Clock */}
          <div className="flex items-center gap-2.5">
            <div className="text-primary">
              <Clock size={20} strokeWidth={2} />
            </div>
            <div className="text-left">
              <div className="font-bold text-[15px] text-text-primary tabular-nums tracking-[-0.5px]">
                {timeStr}
              </div>
              <div className="text-[11px] text-text-secondary font-medium">
                {dateStr}
              </div>
            </div>
          </div>

          <div className="w-px h-8 bg-border" />

          {/* Ward */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-text-secondary border border-border">
              <UserRound size={16} strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-xs font-bold text-text-primary">
                Nurse Station
              </div>
              <div className="text-[11px] text-text-tertiary font-medium">
                ICU Ward
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
