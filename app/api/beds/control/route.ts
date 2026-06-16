import { NextRequest } from 'next/server'
import { toggleMonitoringState } from '@/lib/mqtt'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bedId, active } = body

    if (bedId === undefined || active === undefined) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // สั่งเปิด/ปิด sensor ที่ ESP32 ผ่าน MQTT (bedsafe/+/sensor)
    toggleMonitoringState(Number(bedId), Boolean(active))

    return Response.json({ success: true })
  } catch (err) {
    console.error('[API /api/beds/control] POST error:', err)
    return Response.json({ error: 'Failed to toggle monitoring status' }, { status: 500 })
  }
}
