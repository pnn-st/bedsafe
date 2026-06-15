# Realtime Communication

Use MQTT.

Broker:

Mosquitto

Subscribe:

hospital/bed/+/status

Topics:

hospital/bed/1/status

hospital/bed/2/status

hospital/bed/3/status

hospital/bed/4/status

hospital/bed/5/status

hospital/bed/6/status

MQTT Payload Example:

{
    "bedId": 1,
    "patientId": "P001",
    "patientName": "Somchai Jaidee",
    "deviceStatus": "online",
    "alert": false,
    "alertTime": null,
    "updatedAt": "2026-06-15T10:45:12"
}

When Patient Leaves Bed:

{
    "bedId": 1,
    "patientId": "P001",
    "patientName": "Somchai Jaidee",
    "deviceStatus": "online",
    "alert": true,
    "alertTime": "2026-06-15T10:45:12",
    "updatedAt": "2026-06-15T10:45:12"
}

Offline Detection:

If no message is received within 10 seconds:

deviceStatus = offline

Alert Rules:

When alert = true:

- Update Bed Map immediately.
- Show popup notification.
- Play alarm sound.
- Add entry to alert history.
