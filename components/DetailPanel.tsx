'use client'

import { useState, useEffect } from 'react'
import type { BedState } from '@/lib/types'

interface DetailPanelProps {
  bed: BedState | null
  onClose: () => void
}

type UiStatus = 'occupied' | 'empty' | 'alert' | 'offline'

const STATUS_LABEL: Record<UiStatus, { text: string; colorClass: string; bgClass: string; borderClass: string }> = {
  occupied: { text: 'มีผู้ป่วย', colorClass: 'text-occupied', bgClass: 'bg-occupied-bg', borderClass: 'border-transparent' },
  empty: { text: 'เตียงว่าง', colorClass: 'text-empty', bgClass: 'bg-empty-bg', borderClass: 'border-transparent' },
  alert: { text: 'ALERT!', colorClass: 'text-white', bgClass: 'bg-alert', borderClass: 'border-alert' },
  offline: { text: 'Offline', colorClass: 'text-offline', bgClass: 'bg-offline-bg', borderClass: 'border-transparent' },
}

function getUiStatus(bed: BedState): UiStatus {
  if (bed.deviceStatus === 'offline') return 'offline'
  if (bed.alert) return 'alert'
  if (bed.patientId) return 'occupied'
  return 'empty'
}

export default function DetailPanel({ bed, onClose }: DetailPanelProps) {
  if (!bed) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col items-center justify-center h-full min-h-[300px] text-text-tertiary text-center gap-3">
        <div className="text-[40px]">🛏️</div>
        <div className="text-[13px] font-medium">เลือกเตียงเพื่อดูรายละเอียด</div>
        <div className="text-[11px]">คลิกที่ Card เตียงด้านซ้าย</div>
      </div>
    )
  }

  const status = getUiStatus(bed)
  const statusCfg = STATUS_LABEL[status]
  const isAlert = status === 'alert'

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const formattedTime = mounted ? new Date(bed.updatedAt).toLocaleString('th-TH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) : '--/--/---- --:--:--'

  return (
    <div className={`animate-slide-in bg-surface border rounded-2xl overflow-hidden shadow-md ${isAlert ? 'border-alert-border' : 'border-border'}`}>
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-extrabold text-text-primary">
            {bed.bedName}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusCfg.bgClass} ${statusCfg.colorClass} ${statusCfg.borderClass}`}>
            {statusCfg.text}
          </span>
        </div>
        <button
          onClick={onClose}
          className="bg-transparent border-none cursor-pointer text-text-secondary text-lg p-1 rounded-md flex items-center hover:bg-surface hover:text-text-primary transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="p-5">
        {/* Device & Bed Status */}
        <section className="mb-5">
          <div className="text-xs font-semibold text-text-secondary mb-2.5 uppercase tracking-[0.05em]">
            สถานะ
          </div>
          <div className="flex flex-col gap-2">
            <InfoRow label="สถานะอุปกรณ์" value={
              <span className={`font-semibold text-xs ${bed.deviceStatus === 'online' ? 'text-occupied' : 'text-alert'}`}>
                {bed.deviceStatus === 'online' ? '🟢 Online' : '🔴 Offline'}
              </span>
            } />
            {isAlert && bed.alertTime && (
              <InfoRow label="เวลาแจ้งเตือน" value={
                <span className="font-bold text-alert">
                  {new Date(bed.alertTime).toLocaleTimeString('th-TH')}
                </span>
              } />
            )}
          </div>
        </section>

        {/* Patient Info */}
        {bed.patientId ? (
          <section className="mb-5">
            <div className="text-xs font-semibold text-text-secondary mb-2.5 uppercase tracking-[0.05em]">
              ข้อมูลผู้ป่วย
            </div>
            <div className="flex flex-col gap-2">
              <InfoRow label="รหัสผู้ป่วย" value={<strong>{bed.patientId}</strong>} />
              <InfoRow label="ชื่อ-นามสกุล" value={bed.patientName ?? '—'} />
              <InfoRow label="อายุ" value={bed.patientAge ? `${bed.patientAge} ปี` : '—'} />
            </div>
          </section>
        ) : (
          <div className="px-4 py-3 bg-surface-2 rounded-lg mb-5 text-xs text-text-tertiary text-center">
            ไม่มีข้อมูลผู้ป่วย
          </div>
        )}

        {/* Timestamp */}
        <div className="px-3.5 py-2.5 bg-surface-2 rounded-lg flex items-center justify-between mb-4">
          <span className="text-[11px] text-text-secondary">อัปเดตล่าสุด</span>
          <span className="text-[11px] font-semibold text-text-primary">{formattedTime}</span>
        </div>

        {/* CTA Button */}
        <a
          href="/history"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-[13px] font-semibold no-underline transition-colors border-none cursor-pointer"
        >
          📋 ดูประวัติการใช้เตียงนี้
        </a>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-text-secondary">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  )
}
