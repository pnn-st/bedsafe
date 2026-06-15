import { getAlertHistory, getPatients } from '@/lib/sheets'
import ExcelJS from 'exceljs'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [events, patients] = await Promise.all([
      getAlertHistory(),
      getPatients(),
    ])

    // สร้าง Workbook
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'BedSafe System'
    workbook.created = new Date()

    // ==============================
    // Sheet 1: Alert History
    // ==============================
    const alertSheet = workbook.addWorksheet('Alert History')

    alertSheet.columns = [
      { header: 'เวลา', key: 'time', width: 22 },
      { header: 'เตียง', key: 'bedId', width: 10 },
      { header: 'รหัสผู้ป่วย', key: 'patientId', width: 14 },
      { header: 'ชื่อ-นามสกุล', key: 'patientName', width: 24 },
      { header: 'เหตุการณ์', key: 'event', width: 22 },
      { header: 'สถานะอุปกรณ์', key: 'deviceStatus', width: 14 },
      { header: 'หมายเหตุ', key: 'note', width: 30 },
    ]

    // Style header row
    const alertHeader = alertSheet.getRow(1)
    alertHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    alertHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' },
    }
    alertHeader.alignment = { horizontal: 'center', vertical: 'middle' }
    alertHeader.height = 22

    events.forEach((event) => {
      const row = alertSheet.addRow({
        time: event.time,
        bedId: `B${event.bedId}`,
        patientId: event.patientId || '—',
        patientName: event.patientName || '—',
        event: event.event,
        deviceStatus: event.deviceStatus,
        note: event.note || '—',
      })

      // สีแถว Alert
      if (event.event === 'PATIENT_LEFT_BED') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF2F2' },
        }
        const statusCell = row.getCell('event')
        statusCell.font = { bold: true, color: { argb: 'FFDC2626' } }
      }
    })

    // ==============================
    // Sheet 2: Patients
    // ==============================
    const patientSheet = workbook.addWorksheet('Patients')

    patientSheet.columns = [
      { header: 'รหัสผู้ป่วย', key: 'patientId', width: 14 },
      { header: 'ชื่อ-นามสกุล', key: 'fullName', width: 26 },
      { header: 'อายุ', key: 'age', width: 8 },
      { header: 'วอร์ด', key: 'ward', width: 20 },
      { header: 'เตียงที่อยู่', key: 'bedId', width: 12 },
      { header: 'วันที่เข้า', key: 'admissionDate', width: 16 },
      { header: 'วันที่ออก', key: 'dischargeDate', width: 16 },
      { header: 'สถานะ', key: 'status', width: 14 },
    ]

    const patientHeader = patientSheet.getRow(1)
    patientHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    patientHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF16A34A' },
    }
    patientHeader.alignment = { horizontal: 'center', vertical: 'middle' }
    patientHeader.height = 22

    patients.forEach((p) => {
      patientSheet.addRow({
        patientId: p.patientId,
        fullName: p.fullName,
        age: p.age,
        ward: p.ward,
        bedId: p.bedId ? `B${p.bedId}` : '—',
        admissionDate: p.admissionDate,
        dischargeDate: p.dischargeDate || '—',
        status: p.status,
      })
    })

    // สร้าง Buffer และส่งกลับ
    const buffer = await workbook.xlsx.writeBuffer()

    const fileName = `bedsafe-export-${new Date().toISOString().slice(0, 10)}.xlsx`

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (err) {
    console.error('[API /export] error:', err)
    return Response.json(
      { error: 'Failed to generate Excel file' },
      { status: 500 }
    )
  }
}
