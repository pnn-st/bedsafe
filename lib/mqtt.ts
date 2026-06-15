import mqtt, { MqttClient } from 'mqtt'
import type { BedState, MqttPayload } from './types'
import { appendAlertHistory, getBeds } from './sheets'

// ==============================
// MQTT Singleton Client
// ==============================

const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883'
const SUBSCRIBE_TOPICS = ['hospital/bed/+/status', 'bedsafe/+/status', 'bedsafe/esp32-001/status']

// Global state: สถานะเตียงทั้ง 6 เก็บไว้ใน memory
const bedStates: Map<number, BedState> = new Map()

// SSE listeners: รายชื่อ callbacks ที่จะถูกเรียกเมื่อมีข้อมูลใหม่
type BedUpdateListener = (bed: BedState) => void
const listeners: Set<BedUpdateListener> = new Set()

let client: MqttClient | null = null
let isConnected = false

// Watchdog timers
const watchdogs: Map<number, NodeJS.Timeout> = new Map()

/** สร้าง BedState เริ่มต้นสำหรับแต่ละเตียง */
function createInitialBedState(bedId: number): BedState {
  return {
    bedId,
    bedName: `B${bedId}`,
    patientId: null,
    patientName: null,
    patientAge: null,
    deviceStatus: 'offline',
    alert: false,
    alertTime: null,
    updatedAt: new Date().toISOString(),
  }
}

/** Initialize เตียงทั้ง 6 ตั้งแต่แรก */
function initBedStates() {
  for (let i = 1; i <= 6; i++) {
    if (!bedStates.has(i)) {
      bedStates.set(i, createInitialBedState(i))
    }
  }
}

/** ดึงสถานะเตียงทั้งหมด */
export function getAllBedStates(): BedState[] {
  return Array.from(bedStates.values()).sort((a, b) => a.bedId - b.bedId)
}

/** ดึงสถานะเตียงตาม ID */
export function getBedState(bedId: number): BedState | undefined {
  return bedStates.get(bedId)
}

/** ลงทะเบียน SSE listener */
export function addListener(cb: BedUpdateListener): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** อัปเดตข้อมูลคนไข้ในเตียง (เรียกจาก Google Sheets) */
export function updateBedPatient(
  bedId: number,
  patient: { patientId: string; patientName: string; patientAge: number } | null
) {
  const bed = bedStates.get(bedId)
  if (!bed) return
  bedStates.set(bedId, {
    ...bed,
    patientId: patient?.patientId ?? null,
    patientName: patient?.patientName ?? null,
    patientAge: patient?.patientAge ?? null,
  })
}

function notifyListeners(bed: BedState) {
  for (const listener of listeners) {
    try {
      listener(bed)
    } catch (err) {
      console.error('[MQTT] Listener error:', err)
    }
  }
}

function triggerWatchdog(bedId: number) {
  const existing = watchdogs.get(bedId)
  if (existing) clearTimeout(existing)

  const timer = setTimeout(() => {
    const bed = bedStates.get(bedId)
    if (bed && bed.deviceStatus === 'online') {
      console.log(`[MQTT] Watchdog triggered for bed ${bedId} (offline)`)
      const updatedBed: BedState = { ...bed, deviceStatus: 'offline', updatedAt: new Date().toISOString() }
      bedStates.set(bedId, updatedBed)
      notifyListeners(updatedBed)

      import('./sheets').then(({ appendAlertHistory }) => {
        appendAlertHistory({
          bedId: updatedBed.bedId,
          patientId: updatedBed.patientId ?? '',
          patientName: updatedBed.patientName ?? '',
          event: 'DEVICE_OFFLINE',
          deviceStatus: 'offline',
          note: 'No MQTT signal within 30 seconds',
        }).catch((err) => console.error('[MQTT] Failed to log DEVICE_OFFLINE to Sheets:', err))
      })
    }
  }, 30000)

  watchdogs.set(bedId, timer)
}

/** เชื่อมต่อ MQTT Broker และโหลดข้อมูลคนไข้จาก Google Sheets */
export async function getMqttClient(): Promise<MqttClient> {
  if (client && isConnected) return client

  initBedStates()

  // โหลดข้อมูลเตียง+คนไข้จาก Google Sheets ตั้งแต่แรก
  try {
    const { getBeds } = await import('./sheets')
    const beds = await getBeds()
    for (const sb of beds) {
      const existing = bedStates.get(sb.bedId)
      if (existing) {
        const update: Partial<BedState> = {
          patientId: sb.patientId ?? existing.patientId,
          patientName: sb.patientName ?? existing.patientName,
          deviceStatus: 'offline', // Default to offline on start
        }

        bedStates.set(sb.bedId, { ...existing, ...update })
      }
    }
    console.log('[MQTT] Loaded bed/patient data from Google Sheets')
  } catch (err) {
    console.warn('[MQTT] Could not load Sheets data (check .env.local):', (err as Error).message)
  }

  console.log(`[MQTT] Connecting to ${BROKER_URL}`)
  client = mqtt.connect(BROKER_URL, {
    clientId: `bedsafe-server-${Math.random().toString(16).slice(2, 8)}`,
    clean: true,
    reconnectPeriod: 3000,
    connectTimeout: 10000,
  })

  client.on('connect', () => {
    isConnected = true
    console.log('[MQTT] Connected to broker')
    client!.subscribe(SUBSCRIBE_TOPICS, { qos: 1 }, (err) => {
      if (err) {
        console.error('[MQTT] Subscribe error:', err)
      } else {
        console.log(`[MQTT] Subscribed to ${SUBSCRIBE_TOPICS.join(', ')}`)
      }
    })
  })

  client.on('message', (topic, payload) => {
    try {
      const data: MqttPayload = JSON.parse(payload.toString())
      handleIncomingMessage(data)
    } catch (err) {
      console.error('[MQTT] Failed to parse message:', err)
    }
  })

  client.on('reconnect', () => {
    console.log('[MQTT] Reconnecting...')
    isConnected = false
  })

  client.on('offline', () => {
    console.log('[MQTT] Broker offline')
    isConnected = false
    for (const [id, bed] of bedStates) {
      bedStates.set(id, { ...bed, deviceStatus: 'offline' })
      notifyListeners(bedStates.get(id)!)
    }
  })

  client.on('error', (err) => {
    console.error('[MQTT] Error:', err.message)
  })

  return client
}

/** ดู connection status */
export function isMqttConnected(): boolean {
  return isConnected
}

/** จัดการข้อมูลที่ได้รับจาก MQTT */
function handleIncomingMessage(data: MqttPayload) {
  const { bedId, patientId, patientName, deviceStatus, alert, alertTime, updatedAt } = data

  if (bedId < 1 || bedId > 6) {
    console.warn(`[MQTT] Invalid bedId: ${bedId}`)
    return
  }

  const existing = bedStates.get(bedId) ?? createInitialBedState(bedId)
  const isAlert = alert !== undefined ? alert : ((data as any).status === 'alert')
  const isNewAlert = !existing.alert && isAlert

  const updatedBed: BedState = {
    ...existing,
    patientId: patientId || existing.patientId,
    patientName: patientName || existing.patientName,
    deviceStatus: deviceStatus || 'online',
    alert: isAlert,
    alertTime: alertTime || (isNewAlert ? new Date().toISOString() : existing.alertTime),
    updatedAt: updatedAt || new Date().toISOString(),
  }

  // Refresh watchdog since we received a message
  triggerWatchdog(bedId)

  bedStates.set(bedId, updatedBed)

  // บันทึก Alert ลง Google Sheets เฉพาะตอนที่ Alert เพิ่งเกิดขึ้นใหม่
  if (isNewAlert) {
    appendAlertHistory({
      bedId: updatedBed.bedId,
      patientId: updatedBed.patientId ?? '',
      patientName: updatedBed.patientName ?? '',
      event: 'PATIENT_LEFT_BED',
      deviceStatus: updatedBed.deviceStatus,
      note: 'Patient left the bed',
    }).catch((err) => console.error('[MQTT] Failed to log alert to Sheets:', err))
  }

  // บันทึกสถานะ update กลับไป Sheets เพื่อ map ว่า active หรือ empty
  // ใน requirement: "active" หรือ "empty" ใน Sheets
  const sheetStatus = updatedBed.patientId ? 'active' : 'empty'
  if ((existing.patientId ? 'active' : 'empty') !== sheetStatus) {
    import('./sheets').then(({ updateBedStatus }) => {
      updateBedStatus(bedId, sheetStatus as 'active' | 'empty').catch((err) => 
        console.error(`[MQTT] Failed to update bed ${bedId} status to Sheets:`, err)
      )
    })
  }

  notifyListeners(updatedBed)
}
