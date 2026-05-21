# SW-420 Vibration Sensor - Quick Reference Card

## Hardware at a Glance

```
┌─────────────────────────────────┐
│  ESP32 PIN CONNECTIONS          │
├─────────────────────────────────┤
│ GPIO 26 ←→ SW-420 DO            │
│ GPIO 25 ←→ Admin Button         │
│ GPIO 27 ←→ Beeper (existing)    │
│ GPIO 4  ←→ Door Sensor (exist)  │
│ GPIO 23 ←→ Relay Lock (exist)   │
│ GND     ←→ Common Ground        │
│ 3.3V    ←→ SW-420 VCC (power)   │
└─────────────────────────────────┘
```

## Wiring Connections (5-minute setup)

### Step 1: Power Up
- ESP32 3.3V → SW-420 VCC (red wire)
- ESP32 GND → SW-420 GND (black wire)

### Step 2: Signal
- ESP32 GPIO 26 → SW-420 DO (green wire)

### Step 3: Admin Button
- Momentary push button
  - Pin 1 → GPIO 25
  - Pin 2 → GND

### Step 4: Verify
- All 3 wires connected to SW-420
- Button between GPIO 25 and GND
- Power on ESP32
- Serial monitor should show startup test

---

## Sensitivity Tuning (1 minute)

1. **Locate potentiometer** on SW-420 module (small screw dial)
2. **Start at middle position** (12 o'clock)
3. **Test gently** - tap locker with finger
   - If triggers: reduce sensitivity (turn dial counter-clockwise)
   - If doesn't trigger: increase sensitivity (turn dial clockwise)
4. **Sweet spot**: Detects firm shake, ignores normal vibrations

---

## Software Workflow (Once)

✅ **Hardware pins defined**:
```cpp
const int vibrationSensorPin = 26;
const int adminIgnoreButtonPin = 25;
```

✅ **Pins initialized in setup()**:
```cpp
pinMode(vibrationSensorPin, INPUT);
pinMode(adminIgnoreButtonPin, INPUT_PULLUP);
```

✅ **Checks called in loop()**:
```cpp
checkVibrationSensor();
checkAdminButton();
```

✅ **Upload firmware** → Done!

---

## Operational Flow (Simple)

```
1. Lock locker → Vibration monitoring ACTIVE
2. Someone hits locker
3. SW-420 detects vibration
4. Beeper: BEEP-BEEP-BEEP (1 second on, 1 second off, repeat)
5. Display: "WARNING! Vibration! Break-in attempt?"
6. MQTT: Alert sent to user & admin
7. Admin presses GPIO 25 button
8. Beeper: STOPS
9. Display: Returns to normal
10. MQTT: ACKNOWLEDGED sent
```

---

## Quick Test (30 seconds)

```bash
# Upload code to ESP32
# Then test:

1. Open Serial Monitor (115200 baud)
2. Power on ESP32
   → You should hear: BEEP (1s) + silence (0.5s) + BEEP (1s)
   → This is the startup test
3. Wait for "MQTT connected" message
4. Use MQTT client to publish: locker/L1/control = LOCK
5. Tap the SW-420 sensor firmly
   → Serial should show: "VIBRATION DETECTED on L1 while locked!"
   → Beeper should start looping continuously
6. Press admin button (GPIO 25)
   → Beeper stops immediately
   → Serial shows: "Admin ignore button pressed!"
```

---

## Troubleshooting (Quick Fixes)

| Problem | Fix |
|---------|-----|
| No vibration detected | 1. Check GPIO 26 connection<br>2. Adjust sensitivity dial<br>3. Test with firm shake |
| Always triggered | Reduce sensitivity (turn dial counter-clockwise) |
| Button doesn't work | Check GPIO 25 → GND connection |
| Beeper doesn't beep | Verify locker is in LOCKED state first |
| MQTT alert not sent | Check Wi-Fi/MQTT connection in serial |

---

## MQTT Payloads (Reference)

```
Vibration Alert Triggered:
  Topic: locker/L1/security
  Payload: VIBRATION_ALERT
  From: ESP32 hardware
  To: User & Admin dashboards

Admin Acknowledges:
  Topic: locker/L1/security
  Payload: ACKNOWLEDGED
  From: ESP32 hardware (button press)
  To: User & Admin dashboards

Clear Alert (from frontend):
  Topic: locker/L1/security
  Payload: IGNORE
  From: Frontend
  To: ESP32 hardware (optional)
```

---

## Pin Reuse Explanation

Originally:
- L3, L4 were LED indicators on pins 19, 25
- You removed L3 and L4 from operation

Now reusing:
- GPIO 26 (free pin) → Vibration sensor input
- GPIO 25 (was L4 LED) → Admin button
- GPIO 19 (was L3 LED) → Available for future use

---

## Real-World Scenario

```
Time    Event                              Hardware     Display        MQTT
────────────────────────────────────────────────────────────────────────────
14:30   User locks locker L1                Relay ON    "LOCKED"       -
14:31   User leaves with goods inside       -           "LOCKED"       -
14:35   Thief tries to pry locker open      Vibration   "WARNING!!"    
        SW-420 detects vibration            Beeper ON   "Vibration!"   ALERT
14:35   User gets notified on phone         -           "ALERT"        Push
14:35   Admin gets notified in dashboard    -           "ALERT"        Push
14:40   Admin sees alert in app             -           "WARNING!!"    -
        Walks to locker                     
14:41   Admin presses button on locker      Button      "LOCKED"       ACK
        Beeper stops immediately           Beeper OFF
14:42   Alert cleared from both apps        -           "LOCKED"       Clear
```

---

## Safety Checklist ✓

- [ ] Button is physically located where only admin can reach
- [ ] Button cannot be accessed remotely (no API/MQTT control)
- [ ] User cannot dismiss vibration alert through app
- [ ] Beeping is loud enough to be heard from distance
- [ ] Alert persists across MQTT disconnect/reconnect
- [ ] Cannot lock locker while alarm is active (prevents cover-up)
- [ ] Security event is logged for audit trail
- [ ] Display shows "WARNING" prominently to prevent misuse

