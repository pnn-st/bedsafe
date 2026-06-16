const mqtt = require('mqtt')
const readline = require('readline')

// เชื่อมต่อ MQTT Broker บนเครื่องคอมพิวเตอร์ของคุณ
const brokerUrl = 'mqtt://localhost:1883'
const clientId = 'esp32-simulator-001'
const bedId = '001'

console.log(`[Simulator] 🔄 กำลังเชื่อมต่อ MQTT Broker ที่ ${brokerUrl}...`)
const client = mqtt.connect(brokerUrl, { clientId })

const topicPing = `bedsafe/esp32-${bedId}/ping`
const topicSensor = `bedsafe/esp32-${bedId}/sensor`
const topicAlert = `bedsafe/esp32-${bedId}/alert`

client.on('connect', () => {
  console.log(`[Simulator] ✅ เชื่อมต่อสำเร็จ! (จำลองเป็นเตียง ${bedId})`)
  
  // รอรับ Ping และคำสั่งควบคุมจากเว็บ
  client.subscribe([topicPing, topicSensor], (err) => {
    if (!err) {
      console.log(`[Simulator] 📡 รอรับคำสั่ง Ping และ Sensor ควบคุมจากเว็บ...`)
    }
  })

  // แสดงเมนูให้ผู้ใช้กดปุ่ม
  console.log('\n=======================================')
  console.log('       เครื่องมือจำลอง ESP32 (เตียง 1)')
  console.log('=======================================')
  console.log('กด 1 : ส่ง Warning (Top=1) - คนไข้ลุกนั่ง')
  console.log('กด 2 : ส่ง Alert (Left=1)  - คนไข้ลงซ้าย')
  console.log('กด 3 : ส่ง Alert (Right=1) - คนไข้ลงขวา')
  console.log('กด a : ซิงค์ปิดเซ็นเซอร์ (sensor:0)')
  console.log('กด b : ซิงค์เปิดเซ็นเซอร์ (sensor:1)')
  console.log('กด r : ส่งข้อมูลปกติ (Top=0, Left=0, Right=0)')
  console.log('กด Ctrl+C เพื่อออกจากโปรแกรม')
  console.log('=======================================\n')
})

client.on('message', (topic, payload) => {
  const message = payload.toString()
  
  if (topic === topicPing) {
    if (message === '0') {
      // ตอบกลับ Ping เพื่อให้หน้าเว็บขึ้น Online
      client.publish(topicPing, '1')
      process.stdout.write('💓 ') // พิมพ์หัวใจเพื่อบอกว่ามีการเต้นของหัวใจ (Ping/Pong)
    }
  } else if (topic === topicSensor) {
    console.log(`\n[Web Command] 💻 เว็บสั่งการมาว่า: ${message}`)
  }
})

// รับคีย์บอร์ดจากผู้ใช้
readline.emitKeypressEvents(process.stdin)
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true)
}

process.stdin.on('keypress', (str, key) => {
  if (key.ctrl && key.name === 'c') {
    console.log('\n[Simulator] 🛑 ปิดโปรแกรม...')
    process.exit()
  }

  let payload = null

  if (str === '1') {
    payload = { top: 1, left: 0, right: 0 }
    console.log('\n[Simulator] 📤 ส่ง Warning (นั่ง)')
  } else if (str === '2') {
    payload = { top: 0, left: 1, right: 0 }
    console.log('\n[Simulator] 📤 ส่ง Alert (ลงซ้าย)')
  } else if (str === '3') {
    payload = { top: 0, left: 0, right: 1 }
    console.log('\n[Simulator] 📤 ส่ง Alert (ลงขวา)')
  } else if (str === 'r') {
    payload = { top: 0, left: 0, right: 0 }
    console.log('\n[Simulator] 📤 ส่งสถานะปกติ (เคลียร์)')
  } else if (str === 'a') {
    client.publish(topicSensor, 'sensor:0')
    console.log('\n[Simulator] 📤 ซิงค์ปิดเซ็นเซอร์')
  } else if (str === 'b') {
    client.publish(topicSensor, 'sensor:1')
    console.log('\n[Simulator] 📤 ซิงค์เปิดเซ็นเซอร์')
  }

  if (payload) {
    client.publish(topicAlert, JSON.stringify(payload))
  }
})
