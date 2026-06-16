import mqtt, { MqttClient } from 'mqtt'
import type { BedState } from './types'
import { appendAlertHistory, getBeds } from './sheets'

// ==============================
// MQTT Singleton Client
// ==============================

const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883'

// ==============================
// MQTT Topics (ทั้งหมด 3 อัน)
// ==============================
// 1. bedsafe/+/ping   → Server ส่ง 0, ESP32 ตอบ 1
// 2. bedsafe/+/sensor → Server ส่ง sensor:1 (เปิด), sensor:0 (ปิด), reset (หยุดเตือน)
// 3. bedsafe/+/alert  → ESP32 ส่ง {"alert": 1} (ส่งเป็น JSON)
const SUBSCRIBE_TOPICS = ['bedsafe/+/ping', 'bedsafe/+/sensor', 'bedsafe/+/alert']

type BedUpdateListener = (bed: BedState) => void

interface GlobalMqttState {
  bedStates: Map<number, BedState>
  listeners: Set<BedUpdateListener>
  client: MqttClient | null
  isConnected: boolean
  watchdogs: Map<number, NodeJS.Timeout>
  pingInterval?: NodeJS.Timeout
}

const globalMqtt = global as unknown as {
  __mqtt_state?: GlobalMqttState
}

if (!globalMqtt.__mqtt_state) {
  globalMqtt.__mqtt_state = {
    bedStates: new Map(),
    listeners: new Set(),
    client: null,
    isConnected: false,
    watchdogs: new Map(),
  }
}

const state = globalMqtt.__mqtt_state
const { bedStates, listeners, watchdogs } = state

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
    warning: false,
    alertTime: null,
    updatedAt: new Date().toISOString(),
    isMonitoringActive: false,
    sensorTop: 0,
    sensorLeft: 0,
    sensorRight: 0,
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
  const updatedBed: BedState = {
    ...bed,
    patientId: patient?.patientId ?? null,
    patientName: patient?.patientName ?? null,
    patientAge: patient?.patientAge ?? null,
    isMonitoringActive: patient !== null, // เปิดการเฝ้าระวังอัตโนมัติเมื่อกรอกข้อมูลคนไข้
    alert: false, // เคลียร์สถานะแจ้งเตือนเมื่อเปลี่ยนคนไข้
    warning: false,
    alertTime: null,
    updatedAt: new Date().toISOString(),
  }
  bedStates.set(bedId, updatedBed)
  notifyListeners(updatedBed)
}

/** สั่งเปิด/ปิด sensor ที่ ESP32 (Topic: bedsafe/+/sensor) */
export function toggleMonitoringState(bedId: number, active: boolean) {
  const bed = bedStates.get(bedId)
  if (!bed) return
  
  const updatedBed: BedState = {
    ...bed,
    isMonitoringActive: active,
    alert: active ? bed.alert : false, // ปิดสถานะแจ้งเตือนหากปิด sensor
    warning: active ? bed.warning : false,
    alertTime: active ? bed.alertTime : null,
    updatedAt: new Date().toISOString(),
    sensorTop: active ? bed.sensorTop : 0,
    sensorLeft: active ? bed.sensorLeft : 0,
    sensorRight: active ? bed.sensorRight : 0,
  }
  bedStates.set(bedId, updatedBed)
  
  // ส่งคำสั่งเปิด/ปิด sensor ไปยัง ESP32
  if (state.client && state.isConnected) {
    const sensorTopic = `bedsafe/esp32-${String(bedId).padStart(3, '0')}/sensor`
    const payload = active ? 'sensor:1' : 'sensor:0'
    state.client.publish(sensorTopic, payload, { qos: 1, retain: true })
    console.log(`[MQTT/sensor] ส่งคำสั่ง: ${payload} ไปที่เตียง ${bedId} (${sensorTopic})`)
  }

  notifyListeners(updatedBed)
}

/** กดหยุด alert แล้วส่งไปบอก ESP32 ด้วย (Topic: bedsafe/+/sensor) */
export function acknowledgeAlert(bedId: number) {
  const bed = bedStates.get(bedId)
  if (!bed) return
  
  const updatedBed: BedState = {
    ...bed,
    alert: false,
    warning: false,
    alertTime: null,
    updatedAt: new Date().toISOString(),
    sensorTop: 0,
    sensorLeft: 0,
    sensorRight: 0,
  }
  bedStates.set(bedId, updatedBed)
  
  // ส่งคำสั่งหยุด alert (reset) ไปยัง ESP32
  if (state.client && state.isConnected) {
    const sensorTopic = `bedsafe/esp32-${String(bedId).padStart(3, '0')}/sensor`
    const payload = 'reset'
    state.client.publish(sensorTopic, payload, { qos: 1 })
    console.log(`[MQTT/sensor] ส่งคำสั่ง: ${payload} ไปที่เตียง ${bedId} (${sensorTopic})`)
  }

  // บันทึกลง Google Sheets
  appendAlertHistory({
    bedId,
    patientId: bed.patientId ?? '',
    patientName: bed.patientName ?? '',
    event: 'ALERT_ACKNOWLEDGED',
    deviceStatus: bed.deviceStatus,
    note: 'Alert acknowledged by staff',
  }).catch((err) => console.error('[MQTT/ack] Failed to log to Sheets:', err))

  notifyListeners(updatedBed)
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

// ==============================
// Watchdog & Ping Interval
// ==============================

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
  }, 10000) // ตัดเป็น Offline ถ้าเงียบหายไปเกิน 10 วินาที

  watchdogs.set(bedId, timer)
}

function startPingInterval() {
  if (state.pingInterval) clearInterval(state.pingInterval)
  state.pingInterval = setInterval(() => {
    if (state.client && state.isConnected) {
      for (const [bedId] of bedStates) {
        // ส่ง '0' ไปยัง ESP32 ทุกๆ 3 วินาที
        const pingTopic = `bedsafe/esp32-${String(bedId).padStart(3, '0')}/ping`
        state.client.publish(pingTopic, '0', { qos: 0 })
      }
    }
  }, 3000)
}

/** เชื่อมต่อ MQTT Broker และโหลดข้อมูลคนไข้จาก Google Sheets */
export async function getMqttClient(): Promise<MqttClient> {
  if (state.client && state.isConnected) return state.client

  initBedStates()

  // โหลดข้อมูลเตียง+คนไข้จาก Google Sheets ตั้งแต่แรก
  try {
    const { getBeds } = await import('./sheets')
    const beds = await getBeds()
      for (const sb of beds) {
        const existing = bedStates.get(sb.bedId)
        if (existing) {
          const update: Partial<BedState> = {
            patientId: sb.patientId || null,
            patientName: sb.patientName || null,
            deviceStatus: 'offline', // Default to offline on start
            isMonitoringActive: !!sb.patientId, // เปิดระบบเฝ้าระวังเริ่มต้นถ้ามีคนไข้
          }

          bedStates.set(sb.bedId, { ...existing, ...update } as BedState)
        }
      }
    console.log('[MQTT] Loaded bed/patient data from Google Sheets')
  } catch (err) {
    console.warn('[MQTT] Could not load Sheets data (check .env.local):', (err as Error).message)
  }

  console.log(`[MQTT] Connecting to ${BROKER_URL}`)
  const mqttClient = mqtt.connect(BROKER_URL, {
    clientId: `bedsafe-server-${Math.random().toString(16).slice(2, 8)}`,
    clean: true,
    reconnectPeriod: 3000,
    connectTimeout: 10000,
  })

  state.client = mqttClient

  mqttClient.on('connect', () => {
    state.isConnected = true
    console.log('[MQTT] Connected to broker')
    startPingInterval()
    mqttClient.subscribe(SUBSCRIBE_TOPICS, { qos: 1 }, (err) => {
      if (err) {
        console.error('[MQTT] Subscribe error:', err)
      } else {
        console.log(`[MQTT] Subscribed to ${SUBSCRIBE_TOPICS.join(', ')}`)
      }
    })
  })

  mqttClient.on('message', (topic, payload) => {
    try {
      const payloadStr = payload.toString()
      // Extract bedId from topic e.g. bedsafe/esp32-001/ping
      const match = topic.match(/bedsafe\/esp32-(\d+)\/(\w+)/)
      if (!match) return
      
      const bedId = parseInt(match[1], 10)
      const subtopic = match[2]

      if (subtopic === 'ping') {
        // ──── 1. Ping: รับ '1' จาก ESP32 ────
        if (payloadStr.trim() === '1') {
          handlePingMessage(bedId)
        }
      } else if (subtopic === 'alert') {
        // ──── 3. Alert: แจ้งเตือนคนไข้ลุก ────
        const data = JSON.parse(payloadStr)
        handleAlertMessage(bedId, data)
      } else if (subtopic === 'sensor') {
        // ──── 2. Sensor: รับการเปลี่ยนสถานะจาก ESP32 (เช่น ซิงค์ตอนกด Serial Monitor) ────
        handleSensorEcho(bedId, payloadStr)
      }
    } catch (err) {
      console.error('[MQTT] Failed to parse message:', err)
    }
  })

  mqttClient.on('reconnect', () => {
    console.log('[MQTT] Reconnecting...')
    state.isConnected = false
  })

  mqttClient.on('offline', () => {
    console.log('[MQTT] Broker offline')
    state.isConnected = false
    for (const [id, bed] of bedStates) {
      bedStates.set(id, { ...bed, deviceStatus: 'offline' })
      notifyListeners(bedStates.get(id)!)
    }
  })

  mqttClient.on('error', (err) => {
    console.error('[MQTT] Error:', err.message)
  })

  return mqttClient
}

/** ดู connection status */
export function isMqttConnected(): boolean {
  return state.isConnected
}

// ==============================
// Topic 1: bedsafe/+/ping
// ESP32 ตอบ '1' กลับมา
// ==============================
function handlePingMessage(bedId: number) {
  if (bedId < 1 || bedId > 6) return

  const existing = bedStates.get(bedId) ?? createInitialBedState(bedId)
  const wasOffline = existing.deviceStatus === 'offline'

  const updatedBed: BedState = {
    ...existing,
    deviceStatus: 'online',
    updatedAt: new Date().toISOString(),
  }

  // รีเซ็ต watchdog
  triggerWatchdog(bedId)
  bedStates.set(bedId, updatedBed)

  if (wasOffline) {
    console.log(`[MQTT/ping] Bed ${bedId} is now ONLINE`)
  }

  notifyListeners(updatedBed)
}

// ==============================
// Topic 3: bedsafe/+/alert
// ESP32 ส่ง {"top" : 1/0, "left" : 1/0, "right": 1/0}
// ==============================
function handleAlertMessage(bedId: number, data: { top?: number; left?: number; right?: number }) {
  if (bedId < 1 || bedId > 6) return

  const existing = bedStates.get(bedId) ?? createInitialBedState(bedId)

  const top = data.top ?? 0
  const left = data.left ?? 0
  const right = data.right ?? 0

  // ถ้า left หรือ right เป็น 1 -> Alert แดง (เสียงดัง)
  // ถ้า top เป็น 1 แต่ left/right เป็น 0 -> Warning เหลือง (ไม่เสียงดัง)
  const isAlertDetected = (left === 1 || right === 1)
  const isWarningDetected = (top === 1 && !isAlertDetected)

  // ถ้าระบบเฝ้าระวังถูกปิดอยู่ จะไม่ยอมรับการ Alert ใดๆ จากอุปกรณ์
  const isAlert = existing.isMonitoringActive && isAlertDetected
  const isWarning = existing.isMonitoringActive && isWarningDetected
  
  const isNewAlert = (!existing.alert && isAlert) || (!existing.warning && isWarning)

  const updatedBed: BedState = {
    ...existing,
    deviceStatus: 'online', // ได้รับ alert แปลว่า online
    alert: isAlert,
    warning: isWarning,
    alertTime: isNewAlert ? new Date().toISOString() : existing.alertTime,
    updatedAt: new Date().toISOString(),
    sensorTop: top,
    sensorLeft: left,
    sensorRight: right,
  }

  triggerWatchdog(bedId)
  bedStates.set(bedId, updatedBed)

  // บันทึก Alert ลง Google Sheets เฉพาะตอนที่ Alert เพิ่งเกิดขึ้นใหม่
  if (isNewAlert) {
    const eventType = isAlert ? 'PATIENT_LEFT_BED' : 'PATIENT_SITTING_UP'
    const noteMsg = isAlert ? 'Patient left the bed' : 'Patient is sitting up (Warning)'
    
    console.log(`[MQTT/alert] ${isAlert ? '🚨' : '⚠️'} ${noteMsg} เตียง ${bedId}! (top:${top} left:${left} right:${right})`)
    appendAlertHistory({
      bedId: updatedBed.bedId,
      patientId: updatedBed.patientId ?? '',
      patientName: updatedBed.patientName ?? '',
      event: eventType as any,
      deviceStatus: updatedBed.deviceStatus,
      note: `${noteMsg} (sensors - top:${top} left:${left} right:${right})`,
    }).catch((err) => console.error('[MQTT/alert] Failed to log to Sheets:', err))
  }

  notifyListeners(updatedBed)
}

// ==============================
// Topic 2: bedsafe/+/sensor
// รับค่าซิงค์สถานะกลับมาจาก ESP32 (เช่น ส่ง sensor:1, sensor:0, reset)
// ==============================
function handleSensorEcho(bedId: number, payloadStr: string) {
  if (bedId < 1 || bedId > 6) return
  
  const bed = bedStates.get(bedId)
  if (!bed) return

  let updatedBed: BedState | null = null

  if (payloadStr === 'sensor:1' && !bed.isMonitoringActive) {
    updatedBed = { ...bed, isMonitoringActive: true, updatedAt: new Date().toISOString() }
    console.log(`[MQTT/sensor] ซิงค์สถานะ: เตียง ${bedId} เปิดการเฝ้าระวังแล้วจากอุปกรณ์`)
  } else if (payloadStr === 'sensor:0' && bed.isMonitoringActive) {
    updatedBed = { ...bed, isMonitoringActive: false, alert: false, warning: false, sensorTop: 0, sensorLeft: 0, sensorRight: 0, updatedAt: new Date().toISOString() }
    console.log(`[MQTT/sensor] ซิงค์สถานะ: เตียง ${bedId} ปิดการเฝ้าระวังแล้วจากอุปกรณ์`)
  } else if (payloadStr === 'reset') {
    updatedBed = { ...bed, alert: false, warning: false, sensorTop: 0, sensorLeft: 0, sensorRight: 0, updatedAt: new Date().toISOString() }
    console.log(`[MQTT/sensor] ซิงค์สถานะ: เตียง ${bedId} ถูก Reset แล้วจากอุปกรณ์`)
  }

  if (updatedBed) {
    bedStates.set(bedId, updatedBed)
    notifyListeners(updatedBed)
  }
}
