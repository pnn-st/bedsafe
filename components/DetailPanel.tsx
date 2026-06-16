'use client'

import { useState, useEffect } from 'react'
import type { BedState } from '@/lib/types'

interface DetailPanelProps {
  bed: BedState | null
  onClose: () => void
}

type UiStatus = 'occupied' | 'empty' | 'alert' | 'warning' | 'offline'

const STATUS_LABEL: Record<UiStatus, { text: string; colorClass: string; bgClass: string; borderClass: string }> = {
  occupied: { text: 'มีผู้ป่วย', colorClass: 'text-occupied', bgClass: 'bg-occupied-bg', borderClass: 'border-transparent' },
  empty: { text: 'เตียงว่าง', colorClass: 'text-empty', bgClass: 'bg-empty-bg', borderClass: 'border-transparent' },
  alert: { text: 'ALERT!', colorClass: 'text-white', bgClass: 'bg-alert', borderClass: 'border-alert' },
  warning: { text: 'WARNING', colorClass: 'text-yellow-700', bgClass: 'bg-yellow-100', borderClass: 'border-yellow-400' },
  offline: { text: 'Offline', colorClass: 'text-offline', bgClass: 'bg-offline-bg', borderClass: 'border-transparent' },
}

function getUiStatus(bed: BedState): UiStatus {
  if (bed.deviceStatus === 'offline') return 'offline'
  if (bed.alert) return 'alert'
  if (bed.warning) return 'warning'
  if (bed.patientId) return 'occupied'
  return 'empty'
}

export default function DetailPanel({ bed, onClose }: DetailPanelProps) {
  const [patientIdInput, setPatientIdInput] = useState('')
  const [patientNameInput, setPatientNameInput] = useState('')
  const [patientAgeInput, setPatientAgeInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
  const isWarning = status === 'warning'

  const formattedTime = mounted ? new Date(bed.updatedAt).toLocaleString('th-TH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) : '--/--/---- --:--:--'

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientIdInput.trim() || !patientNameInput.trim() || !patientAgeInput) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/beds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bedId: bed.bedId,
          patientId: patientIdInput.trim(),
          patientName: patientNameInput.trim(),
          patientAge: Number(patientAgeInput),
        }),
      })
      if (res.ok) {
        setPatientIdInput('')
        setPatientNameInput('')
        setPatientAgeInput('')
      } else {
        alert('เกิดข้อผิดพลาดในการลงทะเบียนคนไข้')
      }
    } catch (err) {
      console.error(err)
      alert('เกิดข้อผิดพลาดในการติดต่อสื่อสารกับเซิร์ฟเวอร์')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDischarge = async () => {
    if (!confirm(`ต้องการจำหน่ายหรือยกเลิกการลงทะเบียนคนไข้รหัส ${bed.patientId} ออกจากเตียง ${bed.bedName} หรือไม่?`)) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/beds?bedId=${bed.bedId}&patientId=${bed.patientId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        alert('เกิดข้อผิดพลาดในการจำหน่ายคนไข้')
      }
    } catch (err) {
      console.error(err)
      alert('เกิดข้อผิดพลาดในการติดต่อสื่อสารกับเซิร์ฟเวอร์')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleMonitoring = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/beds/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bedId: bed.bedId,
          active: !bed.isMonitoringActive,
        }),
      })
      if (!res.ok) {
        alert('เกิดข้อผิดพลาดในการสลับโหมดเฝ้าระวังภัย')
      }
    } catch (err) {
      console.error(err)
      alert('เกิดข้อผิดพลาดในการติดต่อสื่อสารกับเซิร์ฟเวอร์')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcknowledgeAlert = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/beds/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bedId: bed.bedId }),
      })
      if (!res.ok) {
        alert('เกิดข้อผิดพลาดในการหยุดการเตือน')
      }
    } catch (err) {
      console.error(err)
      alert('เกิดข้อผิดพลาดในการติดต่อสื่อสารกับเซิร์ฟเวอร์')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`animate-slide-in bg-surface border rounded-2xl overflow-hidden shadow-md ${isAlert ? 'border-alert-border' : isWarning ? 'border-yellow-400' : 'border-border'}`}>
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
            สถานะทั่วไป
          </div>
          <div className="flex flex-col gap-2">
            <InfoRow label="สถานะอุปกรณ์" value={
              <span className={`font-semibold text-xs ${bed.deviceStatus === 'online' ? 'text-occupied' : 'text-alert'}`}>
                {bed.deviceStatus === 'online' ? '🟢 Online' : '🔴 Offline'}
              </span>
            } />
            {(isAlert || isWarning) && bed.alertTime && (
              <InfoRow label="เวลาแจ้งเตือน" value={
                <span className={`font-bold ${isAlert ? 'text-alert' : 'text-yellow-600'}`}>
                  {new Date(bed.alertTime).toLocaleTimeString('th-TH')}
                </span>
              } />
            )}
            {(isAlert || isWarning) && (
              <div className="mt-2 text-xs font-medium text-text-secondary border border-border p-2 rounded bg-surface-2">
                <div className="font-bold mb-1">เซ็นเซอร์ที่ทำงาน:</div>
                <div className="flex gap-3">
                  <span className={bed.sensorTop ? (isWarning ? 'text-yellow-600 font-bold' : 'text-alert font-bold') : ''}>บน: {bed.sensorTop ? '🔴' : '⚪'}</span>
                  <span className={bed.sensorLeft ? 'text-alert font-bold' : ''}>ซ้าย: {bed.sensorLeft ? '🔴' : '⚪'}</span>
                  <span className={bed.sensorRight ? 'text-alert font-bold' : ''}>ขวา: {bed.sensorRight ? '🔴' : '⚪'}</span>
                </div>
              </div>
            )}
            {(isAlert || isWarning) && (
              <button
                type="button"
                disabled={isLoading}
                onClick={handleAcknowledgeAlert}
                className={`mt-2 w-full px-3 py-2.5 ${isAlert ? 'bg-alert hover:bg-red-700 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white'} border-none rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 ${isAlert ? 'animate-pulse' : ''}`}
              >
                🔔 หยุดการเตือน (Acknowledge)
              </button>
            )}
            
            {/* สวิตช์เปิด/ปิด การเฝ้าระวัง */}
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-border-light">
              <span className="text-text-secondary font-medium">การตรวจจับผู้ป่วยลุก</span>
              <button
                type="button"
                disabled={isLoading || !bed.patientId}
                onClick={handleToggleMonitoring}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  bed.isMonitoringActive ? 'bg-occupied' : 'bg-gray-200'
                } ${(!bed.patientId || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    bed.isMonitoringActive ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Patient Info Form / Detail */}
        {bed.patientId ? (
          <section className="mb-5">
            <div className="text-xs font-semibold text-text-secondary mb-2.5 uppercase tracking-[0.05em] flex justify-between items-center">
              <span>ข้อมูลผู้ป่วย</span>
              {!bed.isMonitoringActive && (
                <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-200">
                  ปิดระบบชั่วคราว
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2 p-3.5 bg-surface-2 border border-border rounded-xl">
              <InfoRow label="รหัสผู้ป่วย" value={<strong>{bed.patientId}</strong>} />
              <InfoRow label="ชื่อ-นามสกุล" value={bed.patientName ?? '—'} />
              <InfoRow label="อายุ" value={bed.patientAge ? `${bed.patientAge} ปี` : '—'} />
              
              <button
                type="button"
                disabled={isLoading}
                onClick={handleDischarge}
                className="mt-3 w-full px-3 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                🚶‍♂️ จำหน่ายคนไข้ (ออกจากเตียง)
              </button>
            </div>
          </section>
        ) : (
          <form onSubmit={handleAssign} className="mb-5 p-4 bg-surface-2 border border-border rounded-xl">
            <div className="text-xs font-bold text-text-primary mb-3 uppercase tracking-[0.05em]">
              ลงทะเบียนคนไข้เข้าเตียง
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[10px] font-bold text-text-secondary mb-1">รหัสผู้ป่วย (HN / ID)</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น P001"
                  value={patientIdInput}
                  onChange={(e) => setPatientIdInput(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-border rounded-md text-xs focus:ring-1 focus:ring-occupied focus:border-occupied focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-secondary mb-1">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สมชาย ใจดี"
                  value={patientNameInput}
                  onChange={(e) => setPatientNameInput(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-border rounded-md text-xs focus:ring-1 focus:ring-occupied focus:border-occupied focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-secondary mb-1">อายุ (ปี)</label>
                <input
                  type="number"
                  required
                  placeholder="เช่น 68"
                  value={patientAgeInput}
                  onChange={(e) => setPatientAgeInput(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-border rounded-md text-xs focus:ring-1 focus:ring-occupied focus:border-occupied focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="mt-1 w-full px-4 py-2 bg-occupied hover:bg-green-600 text-white rounded-md text-xs font-bold transition-colors border-none cursor-pointer flex items-center justify-center gap-1.5"
              >
                📥 ลงทะเบียนและเฝ้าระวัง
              </button>
            </div>
          </form>
        )}

        {/* Timestamp */}
        <div className="px-3.5 py-2.5 bg-surface-2 border border-border rounded-lg flex items-center justify-between mb-4">
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
