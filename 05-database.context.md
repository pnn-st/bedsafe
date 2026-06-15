# Database Context

## Database Type

Use Google Sheets as the prototype database.

Google Sheets will be used only for:

- Bed information
- Patient information
- Alert history

Google Sheets must NOT be used for realtime monitoring.

Realtime data comes from MQTT only.

---

# Spreadsheet Information

Spreadsheet Name:

Stroke_Bed_Exit_System

The spreadsheet contains 3 sheets:

1. Beds
2. Patients
3. AlertHistory

---

# Sheet 1: Beds

Purpose:

Store the current state of each hospital bed.

Columns:

bedId
bedName
patientId
patientName
deviceId
status

Definitions:

bedId:
Unique bed number.

Example:
1

bedName:
Display name.

Example:
Bed 1

patientId:
Current patient assigned to the bed.

Empty string if no patient is assigned.

patientName:
Current patient name.

Empty string if no patient is assigned.

deviceId:
ESP32 identifier.

Example:
ESP32-001

status:
Current bed status.

Allowed values:

active
empty

Example Data:

| bedId | bedName | patientId | patientName | deviceId | status |
|--------|----------|------------|--------------|-----------|---------|
| 1 | Bed 1 | P001 | Somchai Jaidee | ESP32-001 | active |
| 2 | Bed 2 | P002 | Somsri Raksa | ESP32-002 | active |
| 3 | Bed 3 | | | ESP32-003 | empty |
| 4 | Bed 4 | | | ESP32-004 | empty |
| 5 | Bed 5 | | | ESP32-005 | empty |
| 6 | Bed 6 | | | ESP32-006 | empty |

---

# Sheet 2: Patients

Purpose:

Store patient information.

Columns:

patientId
fullName
age
ward
bedId
admissionDate
dischargeDate
status

Definitions:

patientId:
Unique patient identifier.

Example:
P001

fullName:
Patient full name.

age:
Patient age.

ward:
Hospital ward.

Example:
Stroke Unit

bedId:
Current assigned bed.

admissionDate:
Date admitted.

Format:
YYYY-MM-DD

dischargeDate:
Date discharged.

Empty if still admitted.

status:

Allowed values:

active
discharged

Example Data:

| patientId | fullName | age | ward | bedId | admissionDate | dischargeDate | status |
|------------|-----------|-----|-------|--------|----------------|----------------|---------|
| P001 | Somchai Jaidee | 68 | Stroke Unit | 1 | 2026-06-15 | | active |
| P002 | Somsri Raksa | 72 | Stroke Unit | 2 | 2026-06-15 | | active |

---

# Sheet 3: AlertHistory

Purpose:

Store historical alert records.

Columns:

time
bedId
patientId
patientName
event
deviceStatus
note

Definitions:

time:
Date and time of alert.

Format:

YYYY-MM-DD HH:mm:ss

bedId:
Bed number.

patientId:
Patient identifier.

patientName:
Patient name.

event:
Alert event type.

Allowed values:

PATIENT_LEFT_BED
DEVICE_OFFLINE
ALERT_ACKNOWLEDGED

deviceStatus:

Allowed values:

online
offline

note:
Additional description.

Example Data:

| time | bedId | patientId | patientName | event | deviceStatus | note |
|--------|--------|------------|--------------|---------|----------------|---------|
| 2026-06-15 10:45:12 | 1 | P001 | Somchai Jaidee | PATIENT_LEFT_BED | online | Patient left the bed |
| 2026-06-15 11:02:45 | 4 | P004 | Malee Wongdee | DEVICE_OFFLINE | offline | No MQTT signal |

---

# Google Sheets API Rules

Use Google Sheets API.

Use the spreadsheet as a prototype database only.

Implement helper functions for:

getBeds()

getPatients()

getPatientById(patientId)

getAlertHistory()

addAlertHistory(alert)

assignPatientToBed(patientId, bedId)

dischargePatient(patientId)

updateBedStatus(bedId, status)

Do NOT use Google Sheets for realtime bed status updates.

Realtime updates must come from MQTT.

---

# TypeScript Types

Beds:

type Beds = {
    bedId: number;
    bedName: string;
    patientId: string;
    patientName: string;
    deviceId: string;
    status: "active" | "empty";
};

Patients:

type Patients = {
    patientId: string;
    fullName: string;
    age: number;
    ward: string;
    bedId: number;
    admissionDate: string;
    dischargeDate?: string;
    status: "active" | "discharged";
};

AlertHistory:

type AlertHistory = {
    time: string;
    bedId: number;
    patientId: string;
    patientName: string;
    event:
        | "PATIENT_LEFT_BED"
        | "DEVICE_OFFLINE"
        | "ALERT_ACKNOWLEDGED";
    deviceStatus: "online" | "offline";
    note: string;
};

---

# Important Rules

This project is specifically designed for Stroke Unit patients.

The purpose of the system is to notify nurses when stroke patients leave the bed without assistance.

Google Sheets is NOT the source of truth for realtime alerts.

MQTT is the source of truth for realtime events.

Google Sheets is used only for:

- Bed assignment
- Patient information
- Alert history