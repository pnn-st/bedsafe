import { google } from 'googleapis'
import type { Patients, Beds, AlertHistory } from './types'

// ==============================
// Google Sheets API Helper
// ==============================

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEET_ID || ''
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY ?? '')
  .replace(/^"|"$/g, '')
  .replace(/\\n/g, '\n')

/** สร้าง Google Sheets authenticated client */
function getAuth() {
  return new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

// ==============================
// Sheet: Beds
// ==============================
// Columns: bedId | bedName | patientId | patientName | deviceId | status

/** ดึงข้อมูลเตียงทั้งหมดจาก Sheet "Beds" */
export async function getBeds(): Promise<Beds[]> {
  try {
    const sheets = getSheetsClient()
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: 'Beds!A2:F100',
    })
    const rows = res.data.values ?? []
    return rows.map((row) => ({
      bedId: Number(row[0]) || 0,
      bedName: String(row[1] ?? ''),
      patientId: String(row[2] ?? ''),
      patientName: String(row[3] ?? ''),
      deviceId: String(row[4] ?? ''),
      status: String(row[5] ?? 'empty') as 'active' | 'empty',
    }))
  } catch (err) {
    console.error('[Sheets] getBeds error:', err)
    return []
  }
}

/** อัปเดตสถานะเตียงใน Sheet "Beds" */
export async function updateBedStatus(bedId: number, status: 'active' | 'empty'): Promise<void> {
  try {
    const beds = await getBeds()
    const rowIndex = beds.findIndex((b) => b.bedId === bedId)
    if (rowIndex === -1) return

    const sheets = getSheetsClient()
    const sheetRow = rowIndex + 2 // +2 เพราะมี header และ index เริ่มที่ 1
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEETS_ID,
      range: `Beds!F${sheetRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[status]] },
    })
  } catch (err) {
    console.error('[Sheets] updateBedStatus error:', err)
  }
}

// ==============================
// Sheet: Patients
// ==============================
// Columns: patientId | fullName | age | ward | bedId | admissionDate | dischargeDate | status

/** ดึงข้อมูลคนไข้ทั้งหมดจาก Sheet "Patients" */
export async function getPatients(): Promise<Patients[]> {
  try {
    const sheets = getSheetsClient()
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: 'Patients!A2:H100',
    })
    const rows = res.data.values ?? []
    return rows.map((row) => ({
      patientId: String(row[0] ?? ''),
      fullName: String(row[1] ?? ''),
      age: Number(row[2]) || 0,
      ward: String(row[3] ?? ''),
      bedId: Number(row[4]) || 0,
      admissionDate: String(row[5] ?? ''),
      dischargeDate: row[6] ? String(row[6]) : undefined,
      status: String(row[7] ?? 'active') as 'active' | 'discharged',
    }))
  } catch (err) {
    console.error('[Sheets] getPatients error:', err)
    return []
  }
}

// ==============================
// Sheet: AlertHistory
// ==============================
// Columns: time | bedId | patientId | patientName | event | deviceStatus | note

/** ดึงประวัติ Alert ทั้งหมดจาก Sheet "AlertHistory" */
export async function getAlertHistory(): Promise<AlertHistory[]> {
  try {
    const sheets = getSheetsClient()
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: 'AlertHistory!A2:G1000',
    })
    const rows = res.data.values ?? []
    return rows.reverse().map((row) => ({
      time: String(row[0] ?? new Date().toISOString()),
      bedId: Number(row[1]) || 0,
      patientId: String(row[2] ?? ''),
      patientName: String(row[3] ?? ''),
      event: String(row[4] ?? '') as 'PATIENT_LEFT_BED' | 'DEVICE_OFFLINE' | 'ALERT_ACKNOWLEDGED',
      deviceStatus: String(row[5] ?? 'online') as 'online' | 'offline',
      note: String(row[6] ?? ''),
    }))
  } catch (err) {
    console.error('[Sheets] getAlertHistory error:', err)
    return []
  }
}

/** บันทึก Alert event ลง Sheet "AlertHistory" */
export async function appendAlertHistory(event: {
  bedId: number
  patientId: string
  patientName: string
  event: 'PATIENT_LEFT_BED' | 'DEVICE_OFFLINE' | 'ALERT_ACKNOWLEDGED'
  deviceStatus: 'online' | 'offline'
  note: string
}): Promise<void> {
  try {
    const sheets = getSheetsClient()
    const timestamp = new Date().toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEETS_ID,
      range: 'AlertHistory!A:G',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[
          timestamp,
          event.bedId,
          event.patientId,
          event.patientName,
          event.event,
          event.deviceStatus,
          event.note,
        ]],
      },
    })
  } catch (err) {
    console.error('[Sheets] appendAlertHistory error:', err)
  }
}

/** กำหนดข้อมูลคนไข้ให้กับเตียงใน Sheets */
export async function assignPatientToBed(
  bedId: number,
  patientId: string,
  patientName: string,
  patientAge: number
): Promise<void> {
  try {
    const sheets = getSheetsClient()

    // 1. อัปเดตข้อมูลใน Sheet "Beds"
    const beds = await getBeds()
    const bedIndex = beds.findIndex((b) => b.bedId === bedId)
    if (bedIndex !== -1) {
      const sheetRow = bedIndex + 2
      // อัปเดต patientId (C) และ patientName (D) พร้อมกัน
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEETS_ID,
        range: `Beds!C${sheetRow}:D${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[patientId, patientName]] },
      })
      // อัปเดต status (F) เป็น active
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEETS_ID,
        range: `Beds!F${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['active']] },
      })
    }

    // 2. อัปเดตข้อมูลใน Sheet "Patients"
    const patients = await getPatients()
    const patientIndex = patients.findIndex((p) => p.patientId === patientId)
    const todayStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    if (patientIndex !== -1) {
      const sheetRow = patientIndex + 2
      // อัปเดตข้อมูลเดิมที่มีอยู่แล้ว
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEETS_ID,
        range: `Patients!B${sheetRow}:C${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[patientName, patientAge]] },
      })
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEETS_ID,
        range: `Patients!E${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[bedId]] },
      })
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEETS_ID,
        range: `Patients!H${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['active']] },
      })
    } else {
      // เพิ่มคนไข้รายใหม่ลงท้ายตาราง
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEETS_ID,
        range: 'Patients!A:H',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [[patientId, patientName, patientAge, 'Stroke Unit', bedId, todayStr, '', 'active']],
        },
      })
    }
  } catch (err) {
    console.error('[Sheets] assignPatientToBed error:', err)
  }
}

/** จำหน่ายคนไข้หรือย้ายคนไข้ออกจากเตียงใน Sheets */
export async function dischargePatient(bedId: number, patientId: string): Promise<void> {
  try {
    const sheets = getSheetsClient()

    // 1. อัปเดตข้อมูลใน Sheet "Beds" (ล้างข้อมูลคนไข้)
    const beds = await getBeds()
    const bedIndex = beds.findIndex((b) => b.bedId === bedId)
    if (bedIndex !== -1) {
      const sheetRow = bedIndex + 2
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEETS_ID,
        range: `Beds!C${sheetRow}:D${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['', '']] },
      })
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEETS_ID,
        range: `Beds!F${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['empty']] },
      })
    }

    // 2. อัปเดตข้อมูลใน Sheet "Patients"
    const patients = await getPatients()
    const patientIndex = patients.findIndex((p) => p.patientId === patientId && p.status === 'active')
    const todayStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    if (patientIndex !== -1) {
      const sheetRow = patientIndex + 2
      // ปลด bedId เป็น 0 (ไม่มีเตียง)
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEETS_ID,
        range: `Patients!E${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[0]] },
      })
      // บันทึกวันที่จำหน่าย (G) และปรับสถานะเป็น discharged (H)
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEETS_ID,
        range: `Patients!G${sheetRow}:H${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[todayStr, 'discharged']] },
      })
    }
  } catch (err) {
    console.error('[Sheets] dischargePatient error:', err)
  }
}
