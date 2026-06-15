import { getAlertHistory, getPatients, getBeds } from '@/lib/sheets'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [events, patients, beds] = await Promise.all([
      getAlertHistory(),
      getPatients(),
      getBeds(),
    ])

    return Response.json({
      events,
      patients,
      beds,
    })
  } catch (err) {
    console.error('[API /history] error:', err)
    return Response.json(
      { error: 'Failed to fetch history data' },
      { status: 500 }
    )
  }
}
