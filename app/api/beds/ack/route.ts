import { NextRequest } from 'next/server'
import { acknowledgeAlert } from '@/lib/mqtt'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bedId } = body

    if (bedId === undefined) {
      return Response.json({ error: 'Missing bedId' }, { status: 400 })
    }

    // หยุด alert ในหน่วยความจำ + ส่งไปบอก ESP32 ผ่าน MQTT (bedsafe/+/ack)
    acknowledgeAlert(Number(bedId))

    return Response.json({ success: true })
  } catch (err) {
    console.error('[API /api/beds/ack] POST error:', err)
    return Response.json({ error: 'Failed to acknowledge alert' }, { status: 500 })
  }
}
