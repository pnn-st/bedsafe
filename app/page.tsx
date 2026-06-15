'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import HeaderBar from '@/components/HeaderBar'
import StatCards from '@/components/StatCards'
import BedCard from '@/components/BedCard'
import dynamic from 'next/dynamic'
const DetailPanel = dynamic(() => import('@/components/DetailPanel'), { ssr: false })
import AlertTable from '@/components/AlertTable'
import type { BedState, AlertHistory, DashboardSummary, SseMessage } from '@/lib/types'

// ข้อมูล Mock ถูกเอาออกเพื่อให้ดึงข้อมูลจาก Server-Sent Events อย่างเดียวเท่านั้น
const MOCK_BEDS: BedState[] = []

const MOCK_EVENTS: AlertHistory[] = [
  {
    time: new Date(Date.now() - 60000).toISOString(),
    bedId: 4, patientId: 'P004', patientName: 'อนันต์ สุขใจ',
    event: 'PATIENT_LEFT_BED', deviceStatus: 'online', note: 'Patient left the bed',
  },
  {
    time: new Date(Date.now() - 300000).toISOString(),
    bedId: 5, patientId: '', patientName: '',
    event: 'DEVICE_OFFLINE', deviceStatus: 'offline', note: 'No MQTT signal within 30 seconds',
  },
]

export default function DashboardPage() {
  const [beds, setBeds] = useState<BedState[]>(MOCK_BEDS)
  const [events, setEvents] = useState<AlertHistory[]>(MOCK_EVENTS)
  const [selectedBedId, setSelectedBedId] = useState<number | null>(null)
  const [mqttConnected, setMqttConnected] = useState(false)
  const sseRef = useRef<EventSource | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // คำนวณ Summary
  const summary: DashboardSummary = {
    totalBeds: 6,
    devicesOnline: beds.filter((b) => b.deviceStatus === 'online').length,
    occupiedBeds: beds.filter((b) => b.patientId).length,
    activeAlerts: beds.filter((b) => b.alert).length,
  }

  const selectedBed = selectedBedId ? beds.find((b) => b.bedId === selectedBedId) ?? null : null

  // แจ้งเตือนเสียงเมื่อมี Alert
  useEffect(() => {
    if (summary.activeAlerts > 0) {
      if (!audioRef.current) {
        audioRef.current = new Audio('/alert-sound.mp3') // Assume this exists or user adds it later
        audioRef.current.loop = true
      }
      audioRef.current.play().catch((err) => console.log('Audio autoplay prevented:', err))
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }, [summary.activeAlerts])

  // อัปเดตสถานะเตียงเมื่อได้รับข้อมูลจาก SSE
  const handleBedUpdate = useCallback((updated: BedState) => {
    setBeds((prev) =>
      prev.map((b) => (b.bedId === updated.bedId ? { ...b, ...updated } : b))
    )

    // ถ้ามีการเปลี่ยนสถานะเป็น alert เพิ่งเกิด ให้บันทึกลง events table (simulate real-time logging)
    setBeds((prev) => {
      const oldBed = prev.find(b => b.bedId === updated.bedId)
      if (oldBed && !oldBed.alert && updated.alert) {
        setEvents((prevEvents) => [
          {
            time: updated.updatedAt,
            bedId: updated.bedId,
            patientId: updated.patientId || '',
            patientName: updated.patientName || '',
            event: 'PATIENT_LEFT_BED',
            deviceStatus: updated.deviceStatus,
            note: 'Patient left the bed',
          },
          ...prevEvents.slice(0, 49),
        ])
      }
      if (oldBed && oldBed.deviceStatus === 'online' && updated.deviceStatus === 'offline') {
        setEvents((prevEvents) => [
          {
            time: updated.updatedAt,
            bedId: updated.bedId,
            patientId: updated.patientId || '',
            patientName: updated.patientName || '',
            event: 'DEVICE_OFFLINE',
            deviceStatus: 'offline',
            note: 'No MQTT signal within 30 seconds',
          },
          ...prevEvents.slice(0, 49),
        ])
      }
      return prev
    })
  }, [])

  // เชื่อมต่อ SSE
  useEffect(() => {
    const source = new EventSource('/api/mqtt-stream')
    sseRef.current = source

    source.onopen = () => setMqttConnected(true)
    source.onerror = () => setMqttConnected(false)

    source.onmessage = (e) => {
      try {
        const msg: SseMessage = JSON.parse(e.data)
        if (msg.type === 'connected') {
          setMqttConnected(true)
          const allBeds = msg.data as BedState[]
          if (Array.isArray(allBeds) && allBeds.length > 0) {
            setBeds(allBeds)
          }
        } else if (msg.type === 'bed_update' || msg.type === 'alert') {
          setMqttConnected(true) // กำหนดให้เป็น true เสมอเวลาได้รับข้อมูล
          handleBedUpdate(msg.data as BedState)
        }
      } catch {
        // parse error
      }
    }

    return () => {
      source.close()
      sseRef.current = null
    }
  }, [handleBedUpdate])

  // Legend items
  const legends = [
    { colorClass: 'bg-occupied', label: 'NORMAL (Occupied)' },
    { colorClass: 'bg-empty', label: 'EMPTY (No Patient)' },
    { colorClass: 'bg-alert', label: 'ALERT' },
    { colorClass: 'bg-offline', label: 'OFFLINE' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <HeaderBar mqttConnected={mqttConnected} />

      <main className="max-w-[1440px] mx-auto p-6 flex flex-col gap-6">
        {/* Stat Cards */}
        <StatCards summary={summary} />

        {/* Bed Map + Detail Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
          {/* Left: Bed Map */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="text-primary-dark">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>
                </div>
                <div>
                  <div className="font-extrabold text-base text-text-primary uppercase tracking-[0.5px]">Bed Map</div>
                  <div className="text-[11px] text-text-secondary font-semibold">ภาพรวมสถานะเตียง</div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 flex-wrap justify-end">
                {legends.map((l) => (
                  <div key={l.label} className="flex items-center gap-1">
                    <span className={`w-2.5 h-2.5 rounded-sm ${l.colorClass} shrink-0`} />
                    <span className="text-[10px] text-text-secondary">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3x2 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {beds.map((bed) => (
                <BedCard
                  key={bed.bedId}
                  bed={bed}
                  isSelected={selectedBedId === bed.bedId}
                  onClick={() => setSelectedBedId(bed.bedId === selectedBedId ? null : bed.bedId)}
                />
              ))}
            </div>
          </div>

          {/* Right: Detail Panel */}
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <div className="text-primary-dark">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
              </div>
              <span className="font-extrabold text-base text-text-primary uppercase tracking-[0.5px]">รายละเอียดเตียง</span>
            </div>
            <DetailPanel
              bed={selectedBed}
              onClose={() => setSelectedBedId(null)}
            />
          </div>
        </div>

        {/* Bottom: Alert Table + Patient History Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alert Table */}
          <AlertTable events={events} />

          {/* Patient Quick List */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-2">
              <div className="flex items-center gap-2.5">
                <div className="text-primary-dark">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <span className="font-bold text-sm text-text-primary uppercase tracking-[0.5px]">
                  ผู้ป่วยบนเตียง
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    {['รหัส', 'ชื่อ-นามสกุล', 'เตียง', 'สถานะ'].map((h) => (
                      <th key={h} className="px-5 py-3 text-[11px] font-semibold text-text-secondary uppercase tracking-[0.5px] whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {beds.filter(b => b.patientId).map((b) => (
                    <tr key={b.bedId} className="border-b border-border bg-surface hover:bg-surface-2 transition-colors">
                      <td className="px-5 py-3 text-xs font-semibold text-text-secondary">{b.patientId}</td>
                      <td className="px-5 py-3 text-[13px] font-bold text-text-primary max-w-[130px] truncate">
                        {b.patientName}
                      </td>
                      <td className="px-5 py-3 text-[13px] font-extrabold text-primary-dark">{b.bedName}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-[0.5px] ${b.alert ? 'bg-alert-bg text-alert' : 'bg-occupied-bg text-occupied'}`}>
                          {b.alert ? 'ALERT' : 'NORMAL'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center p-4 text-[11px] text-text-muted border-t border-border mt-2">
        © 2024 BedSafe — Bed Monitoring System | Hospital Dashboard
      </footer>
    </div>
  )
}
