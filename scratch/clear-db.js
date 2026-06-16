// Use --env-file flag instead of dotenv
const { google } = require('googleapis')

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEET_ID
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n')

const auth = new google.auth.JWT({
  email: CLIENT_EMAIL,
  key: PRIVATE_KEY,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

const sheets = google.sheets({ version: 'v4', auth })

async function clearData() {
  try {
    console.log('[1/3] กำลังลบประวัติการแจ้งเตือน (AlertHistory)...')
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEETS_ID,
      range: 'AlertHistory!A2:G1000',
    })

    console.log('[2/3] กำลังลบข้อมูลคนไข้ (Patients)...')
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEETS_ID,
      range: 'Patients!A2:H1000',
    })

    console.log('[3/3] กำลังรีเซ็ตสถานะเตียง (Beds)...')
    // เคลียร์ค่าคนไข้และตั้งสถานะเป็น empty สำหรับเตียง 1-6
    const emptyBeds = Array(6).fill(['', '', '', 'empty'])
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEETS_ID,
      range: 'Beds!C2:F7',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: emptyBeds,
      },
    })

    console.log('✅ ล้างข้อมูลใน Database ทั้งหมดเรียบร้อยแล้ว!')
  } catch (err) {
    console.error('❌ เกิดข้อผิดพลาด:', err.message)
  }
}

clearData()
