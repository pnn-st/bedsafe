# HiveMQ Cloud Setup Guide

> บันทึกวิธีเชื่อม MQTT ผ่าน HiveMQ Cloud (สำรองสำหรับตอน deploy จริง)
> ปัจจุบันโปรเจคใช้ Mosquitto ที่รันบนเครื่อง Local

---

## 1. สมัครและสร้าง Cluster

1. ไปที่ [https://www.hivemq.com/cloud/](https://www.hivemq.com/cloud/)
2. กด **Start Free**
3. สมัครด้วย Email หรือ GitHub
4. กด **Create New Cluster** → เลือก Free Tier
5. รอสักครู่ จะได้ข้อมูลดังนี้:
   - **Cluster URL**: `xxxxxxxx.s1.eu.hivemq.cloud`
   - **Port (MQTT)**: `8883` (TLS)
   - **Port (WebSocket)**: `8884` (WSS)

---

## 2. สร้าง Credentials

1. ไปที่แท็บ **Access Management**
2. กด **Add Credentials**
3. ตั้ง Username และ Password ที่ต้องการ
4. จด Username / Password ไว้

---

## 3. ตั้งค่า ESP32

แก้ไขโค้ด ESP32 ให้ใช้ค่าดังนี้:

```cpp
const char* mqtt_server = "xxxxxxxx.s1.eu.hivemq.cloud"; // เปลี่ยนเป็น URL จริง
const int   mqtt_port   = 8883;                           // TLS port
const char* mqtt_user   = "your_username";
const char* mqtt_pass   = "your_password";

// ต้องใช้ WiFiClientSecure แทน WiFiClient
#include <WiFiClientSecure.h>
WiFiClientSecure espClient;
PubSubClient client(espClient);

// setup():
espClient.setInsecure(); // หรือใส่ Root CA Certificate ถ้าต้องการความปลอดภัยสูง
```

---

## 4. ตั้งค่า Next.js (.env)

แก้ไขไฟล์ `.env.local`:

```env
# เปลี่ยนจาก local mosquitto
# MQTT_BROKER_URL=mqtt://localhost:1883

# เป็น HiveMQ Cloud
MQTT_BROKER_URL=mqtts://xxxxxxxx.s1.eu.hivemq.cloud:8883
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
```

---

## 5. เปรียบเทียบ Local vs Cloud

| | Mosquitto Local | HiveMQ Cloud |
|---|---|---|
| **URL** | `mqtt://localhost:1883` | `mqtts://xxx.hivemq.cloud:8883` |
| **Port** | 1883 | 8883 (TLS) |
| **Auth** | ไม่ต้องใส่ (local) | ต้องใส่ username/password |
| **Protocol** | `mqtt://` | `mqtts://` (secure) |
| **ESP32 WiFi** | ต้องอยู่ LAN เดียวกัน | ใช้ได้ทุกที่ |

---

## Topics ที่ใช้ในโปรเจค

```
bedsafe/bed/1/status    → สถานะเตียง 1 (occupied/empty/alert)
bedsafe/bed/2/status    → สถานะเตียง 2
bedsafe/bed/3/status    → สถานะเตียง 3
bedsafe/bed/4/status    → สถานะเตียง 4
bedsafe/bed/5/status    → สถานะเตียง 5
bedsafe/bed/6/status    → สถานะเตียง 6
bedsafe/bed/+/status    → Subscribe ทุกเตียงพร้อมกัน (wildcard)
```

---

> **หมายเหตุ**: HiveMQ Cloud Free Tier รองรับ 100 concurrent connections และข้อความไม่จำกัด เหมาะสำหรับโปรเจคนี้ที่มีแค่ 6 เตียง
