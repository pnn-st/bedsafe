import { NextRequest } from 'next/server'
import { getMqttClient, getAllBedStates, addListener, isMqttConnected } from '@/lib/mqtt'
import type { BedState, SseMessage } from '@/lib/types'

// ต้องเป็น dynamic เพราะ SSE ต้องการ streaming
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Initialize MQTT client (singleton — จะ connect ครั้งเดียว)
  await getMqttClient()

  const encoder = new TextEncoder()

  // สร้าง SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Helper: ส่ง SSE event ไปหา browser
      function sendEvent(msg: SseMessage) {
        const data = `data: ${JSON.stringify(msg)}\n\n`
        try {
          controller.enqueue(encoder.encode(data))
        } catch {
          // connection ปิดแล้ว
        }
      }

      // ส่งสถานะปัจจุบันทั้งหมดทันทีเมื่อ connect
      sendEvent({
        type: 'connected',
        data: getAllBedStates(),
        timestamp: new Date().toISOString(),
      })

      // ลงทะเบียน listener สำหรับรับ update ใหม่จาก MQTT
      const removeListener = addListener((bed: BedState) => {
        sendEvent({
          type: bed.alert ? 'alert' : 'bed_update',
          data: bed,
          timestamp: new Date().toISOString(),
        })
      })

      // Heartbeat ทุก 30 วินาที เพื่อป้องกัน connection timeout
      const heartbeatInterval = setInterval(() => {
        sendEvent({
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
        })
      }, 30000)

      // เมื่อ client disconnect ให้ clean up
      request.signal.addEventListener('abort', () => {
        removeListener()
        clearInterval(heartbeatInterval)
        try {
          controller.close()
        } catch {
          // already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // สำหรับ Nginx
    },
  })
}
