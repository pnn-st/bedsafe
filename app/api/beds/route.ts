import { NextRequest } from 'next/server'
import { assignPatientToBed, dischargePatient } from '@/lib/sheets'
import { updateBedPatient } from '@/lib/mqtt'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bedId, patientId, patientName, patientAge } = body

    if (!bedId || !patientId || !patientName || !patientAge) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // อัปเดตใน Google Sheets
    await assignPatientToBed(Number(bedId), patientId, patientName, Number(patientAge))
    
    // อัปเดตสถานะในหน่วยความจำเซิร์ฟเวอร์ และกระจายข่าวผ่าน SSE
    updateBedPatient(Number(bedId), {
      patientId,
      patientName,
      patientAge: Number(patientAge)
    })

    return Response.json({ success: true })
  } catch (err) {
    console.error('[API /api/beds] POST error:', err)
    return Response.json({ error: 'Failed to assign patient' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bedId = searchParams.get('bedId')
    const patientId = searchParams.get('patientId')

    if (!bedId || !patientId) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // อัปเดตใน Google Sheets
    await dischargePatient(Number(bedId), patientId)

    // อัปเดตสถานะในหน่วยความจำเซิร์ฟเวอร์ และกระจายข่าวผ่าน SSE
    updateBedPatient(Number(bedId), null)

    return Response.json({ success: true })
  } catch (err) {
    console.error('[API /api/beds] DELETE error:', err)
    return Response.json({ error: 'Failed to discharge patient' }, { status: 500 })
  }
}
