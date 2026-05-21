# SW-420 Vibration Sensor Integration Guide for L1 Locker

## Overview
The SW-420 vibration sensor will detect break-in attempts when the L1 locker is **LOCKED**. When triggered, it activates continuous 1-second beeping loops until an admin presses the ignore button to acknowledge the alert.

---

## Hardware Wiring Guide

### SW-420 Module Pinout
- **VCC** → Power (3.3V or 5V, depending on your module variant)
- **GND** → Ground
- **DO** → Digital Output (HIGH when vibration detected)

### ESP32 Pin Assignments

| Component | Pin | Notes |
|-----------|-----|-------|
| SW-420 DO Pin | GPIO 26 | Vibration sensor input (can use pin 19 or 25 if needed) |
| Admin Ignore Button | GPIO 25 | Hidden button for admin to acknowledge alert |
| Beeper | GPIO 27 | Already configured (existing) |
| Door Sensor | GPIO 4 | Already configured (existing) |
| Relay (L1 Lock) | GPIO 23 | Already configured (existing) |

### Wiring Diagram (ASCII)

```
ESP32 Board
├── GPIO 26 ←── SW-420 DO (Digital Output)
├── GND ←── SW-420 GND
├── 3.3V ←── SW-420 VCC (if using 3.3V variant)
│
├── GPIO 25 ←── Admin Button (with pull-up resistor or internal pull-up)
│               └── GND
│
└── [Other existing pins: 4, 23, 27, etc.]
```

### Component Requirements

1. **SW-420 Vibration Sensor Module**
   - 1x SW-420 module (comes with potentiometer for sensitivity tuning)
   - Wires for connections

2. **Push Button for Admin Ignore**
   - 1x momentary push button (normally open)
   - Optional: 10kΩ pull-down resistor (if not using internal pull-up)

3. **Power Considerations**
   - SW-420 requires 3.3V-5V (check your module)
   - Can draw from ESP32's 3.3V pin
   - Ensure adequate power supply for simultaneous operation

---

## Sensitivity Tuning (SW-420)

The SW-420 module includes a small **potentiometer** (variable resistor) on the board:

1. **Clockwise rotation** → Increased sensitivity (detects lighter vibrations)
2. **Counter-clockwise rotation** → Decreased sensitivity (requires stronger vibrations)

### Recommended Setup
- Start with **middle position** on potentiometer
- Test by tapping the locker gently
- Adjust until it detects typical break-in force without false positives

### Testing on Separate Board (Before Integration)
```cpp
int sensorPin = 26;
int ledPin = 2;

void setup() {
  pinMode(sensorPin, INPUT);
  pinMode(ledPin, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  int state = digitalRead(sensorPin);
  if (state == HIGH) {
    digitalWrite(ledPin, HIGH);
    Serial.println("VIBRATION DETECTED!");
  } else {
    digitalWrite(ledPin, LOW);
    Serial.println("No vibration");
  }
  delay(100);
}
```

---

## Security Logic

### State Machine for Vibration Detection

```
Locker State: UNLOCKED
├─ User accessing locker
├─ Vibrations: IGNORED (locker in use)
└─ No security alert

        ↓ User closes door & locks

Locker State: LOCKED
├─ Goods inside, user has left
├─ Vibrations: MONITORED
│  └─ IF vibration detected:
│     ├─ Trigger SECURITY ALARM
│     ├─ Start 1-second beeping loop
│     ├─ Display "WARNING" on OLED
│     ├─ Send alert to MQTT (user + admin)
│     └─ Continue until admin ignores
└─ Admin presses hidden ignore button
   ├─ Stop beeping immediately
   ├─ Clear alert from display
   └─ Resume normal operation
```

---

## MQTT Message Flow

### Alert Triggered (Vibration Detected While Locked)
```
Topic: locker/L1/security
Payload: VIBRATION_ALERT
Recipient: Both user and admin dashboards
Action: Display warning, play sound notification
```

### Admin Acknowledges Alert
```
Topic: locker/L1/security
Payload: IGNORE
Recipient: ESP32 controller
Action: Stop beeping, clear alert, reset state
```

---

## Installation Steps

1. **Disconnect ESP32 from power**
2. **Connect SW-420 sensor**
   - DO → GPIO 26
   - GND → GND
   - VCC → 3.3V
3. **Connect admin button**
   - One pin → GPIO 25
   - Other pin → GND (uses internal pull-up)
4. **Mount SW-420 on/inside L1 locker**
   - Best position: Inside locker body where vibrations transfer easily
   - Avoid excessive shock mounting (should detect break-ins, not normal vibrations)
5. **Tune sensitivity potentiometer**
   - Test with gentle tap: should NOT trigger
   - Test with moderate force: should trigger
6. **Upload modified firmware**
7. **Run self-test and verify beeping works**

---

## Testing Checklist

- [ ] Vibration detection works on separate board
- [ ] Sensitivity potentiometer is tuned (no false positives)
- [ ] Beeper test runs on startup
- [ ] Admin button is physically hidden
- [ ] MQTT connection active
- [ ] Locker unlocked → vibrations ignored
- [ ] Locker locked → vibrations monitored
- [ ] Vibration while locked → beeper activates (1s on/off loop)
- [ ] Admin presses button → beeper stops immediately
- [ ] Warning message sent to user & admin
- [ ] OLED display shows warning animation
- [ ] Alert persists until admin acknowledges

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Vibrations not detected | Check GPIO 26 connection, test with sample code, adjust sensitivity |
| False positives (constant alerts) | Reduce sensitivity (turn potentiometer counter-clockwise) |
| Button not working | Verify GPIO 25 connection, check internal pull-up is enabled |
| Beeper not beeping | Check beeper circuit, verify beeperActiveLow flag is correct |
| MQTT messages not sent | Verify MQTT connection, check topic names |
| Display not showing warning | Check OLED I2C connection (GPIO 21/22) |

---

## Safety Notes

1. **Admin button is hidden** - Users cannot accidentally disable alerts
2. **Continuous beeping** - Forces immediate attention (audible alarm)
3. **Message persistence** - Both user and admin notified until acknowledged
4. **State preservation** - Alert continues until explicitly ignored, not automatically cleared

