# Google Sheets

Purpose:

Prototype Database.

Google Sheets is used only for storing alert history.

Do not use Google Sheets for realtime monitoring.

Realtime data must come from MQTT.

Sheet Name:

AlertHistory

Columns:

time

bedId

patientId

patientName

event

deviceStatus

Example:

2026-06-15 10:45:12

B3

P003

Somchai Jaidee

PATIENT_LEFT_BED

online

---

Features:

Display Alert History Table.

Columns:

Time

Bed

Patient ID

Patient Name

Event

Search

Filter

Pagination

Status Badge

---

Event Types:

PATIENT_LEFT_BED

DEVICE_OFFLINE
