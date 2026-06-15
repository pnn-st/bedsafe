'use client'

import { useState, useEffect } from 'react'
import HeaderBar from '@/components/HeaderBar'
import type { AlertHistory, Patients } from '@/lib/types'

interface HistoryData {
  events: AlertHistory[]
  patients: Patients[]
}

const STATUS_BADGE: Record<string, { label: string; bgClass: string; colorClass: string }> = {
  PATIENT_LEFT_BED: { label: 'PATIENT LEFT BED', bgClass: 'bg-alert-bg', colorClass: 'text-alert' },
  DEVICE_OFFLINE: { label: 'DEVICE OFFLINE', bgClass: 'bg-offline-bg', colorClass: 'text-offline' },
  ALERT_ACKNOWLEDGED: { label: 'ACKNOWLEDGED', bgClass: 'bg-occupied-bg', colorClass: 'text-occupied' },
}

export default function HistoryPage() {
  const [data, setData] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeTab, setActiveTab] = useState<'alerts' | 'patients'>('alerts')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => {
        setError('ไม่สามารถโหลดข้อมูลได้')
        setLoading(false)
      })
  }, [])

  function handleExport() {
    setExporting(true)
    window.location.href = '/api/export'
    setTimeout(() => {
      setExporting(false)
    }, 2000)
  }

  // Filter events
  const filteredEvents = (data?.events ?? []).filter((e) => {
    const matchSearch =
      !search ||
      `B${e.bedId}`.toLowerCase().includes(search.toLowerCase()) ||
      (e.patientName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (e.patientId ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || e.event === filterStatus
    return matchSearch && matchStatus
  })

  // Filter patients
  const filteredPatients = (data?.patients ?? []).filter((p) => {
    return (
      !search ||
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.patientId.toLowerCase().includes(search.toLowerCase())
    )
  })

  return (
    <div className="min-h-screen bg-background">
      <HeaderBar mqttConnected={false} />

      <main className="max-w-[1440px] mx-auto p-6 flex flex-col gap-5">
        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <a 
                href="/" 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:text-teal-700 transition-all no-underline"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                กลับสู่หน้าหลัก
              </a>
            </div>
            <h1 className="text-[22px] font-extrabold text-text-primary mt-1 mb-0">
              ประวัติการใช้งาน
            </h1>
            <p className="text-xs text-text-secondary mt-0.5 mb-0">
              ข้อมูลจาก Google Sheets — AlertHistory / Patients
            </p>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold text-white border-none transition-colors ${exporting ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 cursor-pointer hover:bg-green-700'}`}
          >
            {exporting ? '⏳ กำลัง Export...' : '📥 Export Excel'}
          </button>
        </div>

        {/* Search + Filter */}
        <div className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-3 flex-wrap shadow-sm">
          <div className="relative flex-[1_1_280px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🔍</span>
            <input
              type="text"
              placeholder="ค้นหารหัสผู้ป่วย / ชื่อ / เตียง..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full py-2.5 pr-3 pl-9 border border-border rounded-lg text-[13px] outline-none bg-surface-2 text-text-primary focus:border-primary transition-colors"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="py-2.5 px-3.5 border border-border rounded-lg text-[13px] bg-surface-2 text-text-primary cursor-pointer outline-none focus:border-primary transition-colors"
          >
            <option value="all">ทุกเหตุการณ์</option>
            <option value="PATIENT_LEFT_BED">Patient Left Bed</option>
            <option value="DEVICE_OFFLINE">Device Offline</option>
            <option value="ALERT_ACKNOWLEDGED">Acknowledged</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b-2 border-border">
          {(['alerts', 'patients'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 border-none bg-transparent cursor-pointer text-[13px] font-semibold transition-colors border-b-2 -mb-0.5 ${activeTab === tab ? 'text-primary border-primary' : 'text-text-secondary border-transparent hover:text-text-primary'}`}
            >
              {tab === 'alerts' ? `🔔 Alert History (${filteredEvents.length})` : `👤 ผู้ป่วย (${filteredPatients.length})`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm min-h-[400px]">
          {loading ? (
            <div className="py-16 px-5 text-center text-text-muted">
              <div className="text-4xl mb-3 animate-spin w-fit mx-auto">⏳</div>
              <div className="text-sm font-medium">กำลังโหลดข้อมูลจาก Google Sheets...</div>
            </div>
          ) : error ? (
            <div className="py-16 px-5 text-center text-alert">
              <div className="text-4xl mb-3 w-fit mx-auto">⚠️</div>
              <div className="text-sm font-bold">{error}</div>
              <div className="text-[11px] text-text-muted mt-2">
                ตรวจสอบว่าตั้งค่า GOOGLE_SHEETS_ID และ credentials ใน .env.local แล้ว
              </div>
            </div>
          ) : activeTab === 'alerts' ? (
            <AlertHistoryTable events={filteredEvents} />
          ) : (
            <PatientTable patients={filteredPatients} />
          )}
        </div>
      </main>

      <footer className="text-center p-4 text-[11px] text-text-muted border-t border-border mt-2">
        © 2024 BedSafe — Bed Monitoring System | Hospital Dashboard
      </footer>
    </div>
  )
}

// ==============================
// Sub-components
// ==============================

function AlertHistoryTable({ events }: { events: AlertHistory[] }) {
  if (events.length === 0) {
    return (
      <div className="py-16 px-5 text-center text-text-muted">
        <div className="text-4xl mb-3 w-fit mx-auto">📋</div>
        <div className="text-sm font-medium">ไม่มีประวัติ Alert</div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-surface-2 border-b-2 border-border">
            {['เวลา', 'เตียง', 'รหัสผู้ป่วย', 'ชื่อ-นามสกุล', 'เหตุการณ์', 'หมายเหตุ'].map((h) => (
              <th key={h} className="px-4 py-3 text-[11px] font-bold text-text-secondary uppercase tracking-[0.04em] whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map((event, i) => {
            const badge = STATUS_BADGE[event.event] ?? { label: event.event, bgClass: 'bg-surface-2', colorClass: 'text-text-secondary' }
            const timeStr = (() => {
              const d = new Date(event.time)
              if (isNaN(d.getTime())) return event.time // Fallback to raw string
              return d.toLocaleString('th-TH', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
              })
            })()

            return (
              <tr
                key={i}
                className={`border-b border-border transition-colors ${event.event === 'PATIENT_LEFT_BED' && i % 2 === 0 ? 'bg-[#fff5f5]' : i % 2 === 0 ? 'bg-[#fafafa]' : 'bg-white'} hover:bg-surface-2`}
              >
                <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                  {timeStr}
                </td>
                <td className="px-4 py-3">
                  <span className="font-extrabold text-sm text-text-primary">
                    B{event.bedId}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-text-secondary">
                  {event.patientId ?? '—'}
                </td>
                <td className="px-4 py-3 text-xs text-text-primary max-w-[180px] truncate">
                  {event.patientName ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full ${badge.bgClass} ${badge.colorClass} text-[10px] font-bold whitespace-nowrap`}>
                    {badge.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-text-secondary">
                  {event.note || '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function PatientTable({ patients }: { patients: Patients[] }) {
  if (patients.length === 0) {
    return (
      <div className="py-16 px-5 text-center text-text-muted">
        <div className="text-4xl mb-3 w-fit mx-auto">👤</div>
        <div className="text-sm font-medium">ไม่มีข้อมูลผู้ป่วย</div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-surface-2 border-b-2 border-border">
            {['รหัสผู้ป่วย', 'ชื่อ-นามสกุล', 'อายุ', 'เตียง', 'วันที่เข้า', 'วันที่ออก', 'สถานะ'].map((h) => (
              <th key={h} className="px-4 py-3 text-[11px] font-bold text-text-secondary uppercase tracking-[0.04em] whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {patients.map((p, i) => (
            <tr key={p.patientId} className={`border-b border-border ${i % 2 === 0 ? 'bg-[#fafafa]' : 'bg-white'} hover:bg-surface-2 transition-colors`}>
              <td className="px-4 py-3 text-xs font-bold text-primary">
                {p.patientId}
              </td>
              <td className="px-4 py-3 text-[13px] font-medium text-text-primary">
                {p.fullName}
              </td>
              <td className="px-4 py-3 text-xs text-text-secondary">
                {p.age} ปี
              </td>
              <td className="px-4 py-3">
                {p.bedId ? (
                  <span className="font-extrabold text-[13px] text-blue-800">B{p.bedId}</span>
                ) : (
                  <span className="text-text-muted text-xs">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                {p.admissionDate || '—'}
              </td>
              <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                {p.dischargeDate || '—'}
              </td>
              <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                <span className={`px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'} text-[10px] font-bold`}>
                  {p.status.toUpperCase()}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
