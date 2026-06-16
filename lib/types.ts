// ==============================
// BedSafe — Shared Types
// ==============================

/** ข้อมูล alert ที่ ESP32 ส่งมาผ่าน MQTT (bedsafe/+/alert) */
export interface MqttAlertPayload {
  top: number    // 1 = warning
  left: number   // 1 = alert
  right: number  // 1 = alert
}

/** สถานะเตียงที่ใช้แสดงใน Dashboard */
export interface BedState {
  bedId: number
  bedName: string         // B1, B2, ... B6
  patientId: string | null
  patientName: string | null
  patientAge: number | null
  deviceStatus: 'online' | 'offline'
  alert: boolean          // Left หรือ Right = 1
  warning: boolean        // Top = 1 (แค่เตือน ไม่ส่งเสียง)
  alertTime: string | null
  updatedAt: string       // ISO string
  isMonitoringActive: boolean
  sensorTop: number
  sensorLeft: number
  sensorRight: number
}

/** ข้อมูลจาก Google Sheets (Sheet: Beds) */
export interface Beds {
  bedId: number
  bedName: string
  patientId: string
  patientName: string
  deviceId: string
  status: 'active' | 'empty'
}

/** ข้อมูลคนไข้จาก Google Sheets (Sheet: Patients) */
export interface Patients {
  patientId: string
  fullName: string
  age: number
  ward: string
  bedId: number
  admissionDate: string
  dischargeDate?: string
  status: 'active' | 'discharged'
}

/** ประวัติ Event ที่บันทึกใน Google Sheets (Sheet: AlertHistory) */
export interface AlertHistory {
  time: string
  bedId: number
  patientId: string
  patientName: string
  event: 'PATIENT_LEFT_BED' | 'DEVICE_OFFLINE' | 'ALERT_ACKNOWLEDGED'
  deviceStatus: 'online' | 'offline'
  note: string
}

/** ข้อมูลที่ SSE ส่งไปหา Browser */
export interface SseMessage {
  type: 'bed_update' | 'alert' | 'connected' | 'heartbeat'
  data?: BedState | BedState[] | { bedId: number; message: string }
  timestamp: string
}

/** Summary สำหรับ Stats Cards ด้านบน */
export interface DashboardSummary {
  totalBeds: number
  devicesOnline: number
  occupiedBeds: number
  activeAlerts: number
}
