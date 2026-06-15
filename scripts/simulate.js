const mqtt = require('mqtt')

console.log('Connecting to Mosquitto (mqtt://localhost:1883)...')
const client = mqtt.connect('mqtt://localhost:1883')

client.on('connect', () => {
  console.log('✅ Connected to Local Mosquitto Broker!')
  console.log('Starting simulation for 6 beds...')

  setInterval(() => {
    const now = new Date().toISOString()

    // Bed 1 (Normal, has patient)
    client.publish('hospital/bed/esp32-001/status', JSON.stringify({
      bedId: 1,
      patientId: 'P001',
      patientName: 'สมชาย ใจดี',
      deviceStatus: 'online',
      alert: false,
      alertTime: null,
      updatedAt: now
    }))

    // Bed 2 (Alert! Patient leaving bed)
    client.publish('hospital/bed/esp32-002/status', JSON.stringify({
      bedId: 2,
      patientId: 'P002',
      patientName: 'วิภาวี คำดี',
      deviceStatus: 'online',
      alert: true,
      alertTime: new Date(Date.now() - 5000).toISOString(),
      updatedAt: now
    }))

    // Bed 3 (Normal, has patient)
    client.publish('hospital/bed/esp32-003/status', JSON.stringify({
      bedId: 3,
      patientId: 'P003',
      patientName: 'อนันต์ สุขใจ',
      deviceStatus: 'online',
      alert: false,
      alertTime: null,
      updatedAt: now
    }))

    // Bed 4 (Normal, has patient)
    client.publish('hospital/bed/esp32-004/status', JSON.stringify({
      bedId: 4,
      patientId: 'P004',
      patientName: 'มาลี วงศ์ดี',
      deviceStatus: 'online',
      alert: false,
      alertTime: null,
      updatedAt: now
    }))

    // Bed 5 (Empty, online)
    client.publish('hospital/bed/esp32-005/status', JSON.stringify({
      bedId: 5,
      patientId: null,
      patientName: null,
      deviceStatus: 'online',
      alert: false,
      alertTime: null,
      updatedAt: now
    }))

    // Bed 6 (Offline - we just don't send any message for Bed 6!)
    // It will trigger the 10s watchdog timeout automatically.

    console.log(`[${new Date().toLocaleTimeString()}] Data sent.`)
  }, 3000) // Send every 3 seconds
})

client.on('error', (err) => {
  console.error('MQTT Error:', err.message)
  console.error('Have you installed and started Mosquitto yet?')
})
