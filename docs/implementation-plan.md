# BedSafe — Implementation Plan

ระบบป้องกันผู้ป่วย Stroke ลุกออกจากเตียงโดยไม่ได้รับอนุญาต  
รับข้อมูลจาก ESP32 (Ultrasonic Sensor) ผ่าน MQTT → แสดงผล Real-time บนเว็บ

---

## Tech Stack

| Layer | เทคโนโลยี | เหตุผล |
|---|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript | มีอยู่แล้วในโปรเจค |
| **Styling** | Tailwind CSS v4 | มีอยู่แล้วในโปรเจค |
| **MQTT Broker** | Mosquitto (รันบนเครื่อง Local) | ง่าย ไม่ต้องสมัคร |
| **MQTT Client** | `mqtt` npm package | ใช้ใน Next.js Server |
| **Real-time Browser** | Server-Sent Events (SSE) | เบากว่า WebSocket สำหรับ one-way data |
| **Database** | Google Sheets API | ตามที่ต้องการ |
| **Google Auth** | `googleapis` npm package | จัดการ Auth กับ Sheets |
| **Excel Export** | `exceljs` npm package | สร้างไฟล์ .xlsx |

---

## Architecture & Data Flow

```
[ESP32 x6]
  │  Ultrasonic วัดระยะห่าง
  │  ถ้าระยะ < threshold → คนไข้ลุกขึ้น
  │  Publish MQTT Topic: bedsafe/bed/{id}/status
  ▼
[Mosquitto Broker]  ← รันบนคอมนี้ port 1883
  │  Subscribe ทุก topic: bedsafe/bed/+/status
  ▼
[Next.js API Route: /api/mqtt-stream]
  │  รับข้อมูล MQTT แล้ว Push ผ่าน SSE
  │  บันทึก Alert ลง Google Sheets (AlertHistory)
  ▼
[Browser]
  ├── Dashboard (/) → EventSource รับ SSE → อัปเดต UI
  └── History (/history) → /api/history → Google Sheets
```

---

## MQTT Topics & Payload

### Topic Format
```
bedsafe/bed/{bedNumber}/status
```

### Payload (JSON จาก ESP32)
```json
{
  "bedId": 1,
  "distance": 25.5,
  "status": "alert"
}
```

### Status Values
| status | ความหมาย | สีใน UI |
|---|---|---|
| `"empty"` | ไม่มีคนไข้ / ปกติ | 🔵 น้ำเงิน |
| `"occupied"` | คนไข้นอนอยู่ปกติ | 🟢 เขียว |
| `"alert"` | คนไข้พยายามลุก! | 🔴 แดง |
| `"offline"` | อุปกรณ์ไม่ตอบสนอง | ⚫ เทา |

---

## Google Sheets Structure

### Sheet 1: `Beds` (สถานะเตียงปัจจุบัน)
| bedId | bedName | patientId | patientName | deviceId | status |
|---|---|---|---|---|---|
| 1 | B1 | P001 | สมชาย ใจดี | esp32-001 | occupied |

### Sheet 2: `Patients` (ข้อมูลคนไข้)
| patientId | name | age | admitDate | diagnosis | doctor | bedId |
|---|---|---|---|---|---|---|
| P001 | สมชาย ใจดี | 65 | 2024-06-01 | Stroke | นพ.วิชัย | 1 |

### Sheet 3: `AlertHistory` (ประวัติการแจ้งเตือน)
| timestamp | bedId | bedName | patientId | patientName | status | distance |
|---|---|---|---|---|---|---|
| 2024-06-15 08:30:00 | 4 | B4 | P004 | อนันต์ สุขใจ | alert | 35.2 |

---

## โครงสร้างไฟล์ (Folder Structure)

```
bedsafe/
├── app/
│   ├── layout.tsx              ✅ สร้างแล้ว
│   ├── page.tsx                ✅ Dashboard (6 เตียง)
│   ├── globals.css             ✅ Design System
│   ├── history/
│   │   └── page.tsx            ⬜ หน้าประวัติ + Export Excel
│   └── api/
│       ├── mqtt-stream/
│       │   └── route.ts        ✅ SSE endpoint
│       ├── history/
│       │   └── route.ts        ⬜ GET ดึงข้อมูลจาก Sheets
│       └── export/
│           └── route.ts        ⬜ GET สร้างไฟล์ Excel
├── components/
│   ├── HeaderBar.tsx           ✅ Header + Clock + MQTT status
│   ├── StatCards.tsx           ✅ 4 Summary Cards
│   ├── BedCard.tsx             ✅ Card เตียงแต่ละใบ
│   ├── DetailPanel.tsx         ✅ รายละเอียดเตียง
│   ├── AlertTable.tsx          ✅ ตารางแจ้งเตือน
│   └── HistoryTable.tsx        ⬜ ตารางประวัติ + Export
├── lib/
│   ├── types.ts                ✅ TypeScript types
│   ├── mqtt.ts                 ✅ MQTT Client singleton
│   └── sheets.ts               ⬜ Google Sheets helper
├── docs/
│   ├── implementation-plan.md  ✅ ไฟล์นี้
│   └── hivemq-cloud-setup.md   ✅ วิธีใช้ HiveMQ Cloud
├── .env.example                ✅ Template env
└── package.json
```

---

## Environment Variables (.env.local)

```env
# MQTT (Mosquitto Local)
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_TOPIC_PREFIX=bedsafe

# Google Sheets
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

---

## แผนการพัฒนา (Phases)

| Phase | เนื้อหา | สถานะ |
|---|---|---|
| 1 | Foundation & Setup | ✅ เสร็จ |
| 2 | MQTT Integration (singleton + SSE) | ✅ เสร็จ |
| 3 | Dashboard UI (Header, Cards, Detail, Alert) | ✅ เสร็จ |
| 4 | Google Sheets Integration | 🔄 กำลังทำ |
| 5 | History Page & Export Excel | ⬜ รอ |
| 6 | Polish & Testing | ⬜ รอ |

---

## คำตอบ Open Questions

| คำถาม | คำตอบ |
|---|---|
| Google Service Account | มีแล้ว ✅ |
| ESP32 Payload | `{ bedId, distance, status }` |
| เสียงเตือน | ไม่ใช้เสียง → ใช้ Visual Alert แทน |
| Threshold ระยะ | Hard-code ใน ESP32 ก่อน |
| Sheets structure | Beds / Patients / AlertHistory |
| MQTT Broker | Mosquitto Local (localhost:1883) |

---

> สำรอง: ถ้าต้องการ deploy ภายหลัง ดู `docs/hivemq-cloud-setup.md` สำหรับวิธีเปลี่ยนไปใช้ HiveMQ Cloud
