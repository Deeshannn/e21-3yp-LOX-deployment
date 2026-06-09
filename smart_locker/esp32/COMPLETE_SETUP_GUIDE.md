# Complete SW-420 Integration Guide for L1 Locker

## Overview
You're adding vibration-based break-in detection to Locker 1. When someone tries to force it open while it's locked, the system will:
- Detect vibration via SW-420 sensor
- Start continuous beeping (1-second on/off cycles)
- Display warning on OLED
- Alert both user and admin via MQTT
- Continue until admin acknowledges (presses hidden button)

---

## Part 1: Hardware Setup (20 minutes)

### What You Need
1. **SW-420 Vibration Sensor Module** (the one you tested separately)
2. **Momentary push button** (for admin acknowledgment)
3. **Jumper wires** (4x male-to-male minimum)
4. **Power supply** (existing ESP32 power)

### Wiring Diagram

```
ESP32 Board (Top View)

                    VCC ── SW-420 VCC (red wire)
                    GND ── SW-420 GND (black wire)
                         ── SW-420 DO (green wire) to GPIO 26

       ┌─────────────────────────────────┐
       │         ESP32 DevKit            │
       │                                 │
       │  GND ────────── GND ────┐       │
       │                         │       │
       │  GPIO 26 ───── SW-420 DO       │
       │                         │       │
       │  GPIO 25 ───────┬────── Button  │
       │                 │       (other pin to GND)
       │  3.3V ───────── SW-420 VCC     │
       │                                 │
       └─────────────────────────────────┘
```

### Connection Steps

1. **Disconnect ESP32 from power** (safety first)

2. **Connect SW-420 vibration sensor**:
   - SW-420 VCC (red) → ESP32 3.3V
   - SW-420 GND (black) → ESP32 GND
   - SW-420 DO (green) → ESP32 GPIO 26

3. **Connect admin acknowledgment button**:
   - Push button pin 1 → ESP32 GPIO 25
   - Push button pin 2 → ESP32 GND
   - Note: This button should be mounted where only admin can access it (e.g., inside control room, hidden from users)

4. **Verify all connections** before powering on

5. **Optional**: Label the wires for future reference

### Physical Mounting

**SW-420 Sensor Location**:
- Mount inside L1 locker body
- Position where vibrations transfer easily (near the lock mechanism)
- Avoid placing where users might touch it
- Secure with double-sided tape or small screws

**Admin Button Location**:
- Mount on hidden control panel (not visible to users)
- Could be: inside a cabinet, behind counter, in admin office
- Make it easily accessible for quick acknowledgment
- Test pressing it to ensure smooth operation

---

## Part 2: Software Setup (5 minutes)

### Code Already Integrated

Your `locker_controller.ino` now includes:

✅ **Pin definitions** (line 32):
```cpp
const int vibrationSensorPin = 26;
const int adminIgnoreButtonPin = 25;
```

✅ **State variables** (lines 64-70):
```cpp
bool vibrationDetected = false;
unsigned long vibrationLastDetectedAt = 0;
const unsigned long vibrationDebounceMs = 100;
bool lastAdminButtonState = HIGH;
unsigned long adminButtonLastPressAt = 0;
const unsigned long buttonDebounceMs = 50;
```

✅ **Vibration detection function** (lines 402-419)
✅ **Admin button handler** (lines 421-441)
✅ **Pin initialization** (lines 493-494)
✅ **Main loop calls** (lines 539-540)
✅ **Enhanced display** (shows vibration warnings)

### Compile & Upload

1. **Verify code in VS Code/Arduino IDE**:
   ```
   Sketch → Verify
   ```

2. **Upload to ESP32**:
   ```
   Sketch → Upload
   ```

3. **Open Serial Monitor** (115200 baud):
   - You should see startup messages
   - Beeper should beep twice (self-test)
   - Look for "OLED initialized" message

---

## Part 3: Configuration & Testing (15 minutes)

### Sensitivity Tuning

The SW-420 module has a **potentiometer** (small dial) on the board:

1. **Locate the dial** on the SW-420 module
2. **Start at middle position** (12 o'clock)
3. **Test sensitivity**:
   - Power on ESP32
   - Open serial monitor
   - Unlock locker via MQTT (tap should NOT trigger)
   - Gently tap the locker
   - If triggers: Turn dial counter-clockwise (less sensitive)
   - If doesn't trigger: Turn dial clockwise (more sensitive)

4. **Target behavior**:
   - ✓ Gentle tap (finger pressure): NO alert
   - ✓ Firm shake (hand force): ALERT
   - ✓ Attempted break-in force: ALERT
   - ✓ Normal user access: NO alert

### Software Test Sequence

```
1. Power on ESP32
   Expected: Beeper beeps twice (startup test)
            Serial shows "OLED initialized"

2. Connect to MQTT
   Expected: Serial shows "MQTT connected"

3. Lock locker (MQTT command: locker/L1/control = LOCK)
   Expected: Display shows "State: LOCKED"
            Serial shows "Locker state: LOCKED"

4. Gently shake the locker (mild vibration)
   Expected: Nothing happens (locker is locked but vibration is light)
            Serial shows "VIBRATION DETECTED on L1 while locked!"
            OLED shows "WARNING! Vibration!"
            Beeper starts looping 1-second on/off

5. Press admin button (GPIO 25)
   Expected: Beeper stops immediately
            Display returns to "State: LOCKED"
            Serial shows "Admin ignore button pressed!"

6. Unlock locker (MQTT command: locker/L1/control = UNLOCK)
   Expected: Display shows "State: UNLOCKED"

7. Shake the locker while unlocked
   Expected: Nothing happens (vibrations ignored during use)
            No beeping
            No warning on display
```

### Testing on Separate Board (First Time)

Before testing on the main locker, you can verify SW-420 works:

```cpp
// Simple test sketch (for verification only)
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
    Serial.println("VIBRATION!");
    delay(200);
    digitalWrite(ledPin, LOW);
  } else {
    Serial.println("No vibration");
  }
  delay(100);
}
```

---

## Part 4: MQTT Topics & Messages

### Topics You'll Use

```
locker/L1/security
├─ Sends: ALERT, VIBRATION_ALERT
├─ Sends: ACKNOWLEDGED
└─ Receives: IGNORE (from frontend if needed)

locker/L1/control
├─ Receives: LOCK, UNLOCK
└─ Used for: Locking/unlocking locker

locker/L1/state
├─ Sends: LOCKED, UNLOCKED
└─ Used for: Display locker state
```

### Message Flow

```
When Vibration Detected (while locked):
  1. Hardware detects vibration on GPIO 26
  2. Publishes: locker/L1/security = "VIBRATION_ALERT"
  3. Frontend receives & shows red warning
  4. Beeper starts 1-second loop
  5. Display shows "WARNING!"

When Admin Presses Button:
  1. Button press detected on GPIO 25
  2. Publishes: locker/L1/security = "ACKNOWLEDGED"
  3. Frontend receives & clears warning
  4. Beeper stops immediately
  5. Display returns to normal

Optional - From Frontend:
  1. Admin sends IGNORE command
  2. Frontend publishes: locker/L1/security = "IGNORE"
  3. Hardware receives & clears alarm (if still active)
```

---

## Part 5: Frontend Integration

### What Your App Should Do

**User Dashboard**:
```
On normal state:
  Display: Locker status normally

On vibration alert:
  Visual: Red border, blinking "VIBRATION ALERT!"
  Message: "Security breach detected. Admin notified."
  Sound: Optional notification
  Button: NONE (user cannot dismiss)
  Duration: Until admin acknowledges
```

**Admin Dashboard**:
```
On normal state:
  Display: Locker status normally

On vibration alert:
  Visual: Red border, blinking "VIBRATION ALERT!"
  Message: "Break-in attempt detected on L1"
  Sound: Alert notification
  Button: "ACKNOWLEDGE ALERT" (visible to admin only)
  Action: Publishes IGNORE to MQTT when clicked
  Duration: Until admin clicks button
```

### Frontend Code Updates Needed

Modify your React/Vue components to:

1. **Subscribe to security topic**:
   ```javascript
   mqttClient.subscribe('locker/L1/security')
   ```

2. **Handle vibration alert payload**:
   ```javascript
   if (payload === 'VIBRATION_ALERT') {
     setAlertActive(true);
     showRedWarning();
   }
   ```

3. **Handle acknowledgment**:
   ```javascript
   if (payload === 'ACKNOWLEDGED') {
     setAlertActive(false);
     clearWarning();
   }
   ```

4. **Admin can clear alert**:
   ```javascript
   adminButton.onClick = () => {
     mqttClient.publish('locker/L1/security', 'IGNORE');
   }
   ```

See: `FRONTEND_VIBRATION_INTEGRATION.md` for detailed React example

---

## Part 6: Troubleshooting

### Issue: Beeper never sounds

**Check**:
1. Is locker state "LOCKED"? (Must be locked for vibrations to trigger)
2. Is beeper powered? (Check pin 27 connection)
3. Is sensitivity too low? (Adjust potentiometer clockwise)
4. Check serial monitor for: "VIBRATION DETECTED" message

**Fix**: 
- Verify lock state via MQTT: `locker/L1/state` should be "LOCKED"
- Check beeper wiring to pin 27
- Adjust sensitivity dial
- If still not working, test with separate board sketch

### Issue: Constant alerts (false positives)

**Cause**: Sensitivity is too high, picking up normal vibrations

**Fix**:
1. Turn SW-420 potentiometer counter-clockwise (reduce sensitivity)
2. Test with gentle tap first, increase force until it triggers
3. Aim for: Detects attempted break-in, ignores normal handling

### Issue: Button doesn't work

**Check**:
1. Is button wired to GPIO 25?
2. Is other pin connected to GND?
3. Press firmly (debounce is 50ms)

**Fix**:
- Verify GPIO 25 → button connection
- Check GND connection
- Test in serial monitor (should see message on button press)
- Try different button (might be stuck/faulty)

### Issue: MQTT alerts not received

**Check**:
1. Is Wi-Fi connected? (Check serial monitor)
2. Is MQTT broker connected? (Look for "MQTT connected")
3. Is frontend subscribed to `locker/L1/security`?

**Fix**:
- Check Wi-Fi credentials and signal
- Verify MQTT broker is running
- Check frontend subscription to correct topic
- Publish test message: `mosquitto_pub -t locker/L1/security -m VIBRATION_ALERT`

### Issue: Display doesn't show warning

**Check**:
1. Is OLED working? (Check startup message)
2. Is vibration being detected? (Check serial)
3. Is locker locked? (Vibrations only monitored when locked)

**Fix**:
- Test OLED separately with simple sketch
- Verify I2C connections (GPIO 21=SDA, GPIO 22=SCL)
- Check lock state before testing
- Look for display update code: `displayNeedsUpdate = true`

---

## Part 7: Security Considerations

### Design Principles

✅ **Admin button is physical, not remote**
   - Cannot be controlled via MQTT/API
   - Only physical access allows acknowledgment
   - Prevents remote attacks

✅ **User cannot dismiss alert**
   - No button for user to hide warning
   - Alert persists until admin acts
   - Forces escalation to authority

✅ **Alert persists across connectivity loss**
   - If MQTT drops, beeper continues
   - Alert resumes on reconnection
   - Cannot be silenced by network tricks

✅ **Continuous beeping guarantees attention**
   - 1-second on/off pattern is hard to ignore
   - Audible from distance
   - Can't be "accidentally" missed

### Admin Responsibility

1. **First Response**:
   - Acknowledge alert in app (optional visual confirmation)
   - Press physical button to stop beeper
   - Physically check locker for damage
   - Document incident in log

2. **Investigation**:
   - Check security cameras (if available)
   - Inspect locker for damage/tampering
   - Mark locker as compromised if needed
   - Alert users of their items' status

3. **Prevention**:
   - Adjust sensitivity if false positives
   - Monitor historical alerts for patterns
   - Place in high-traffic/monitored area

---

## Part 8: Maintenance

### Regular Checks

```
Weekly:
  ☐ Test vibration detection (firm shake)
  ☐ Verify admin button works
  ☐ Check beeper sounds on alert
  ☐ Confirm OLED displays correctly

Monthly:
  ☐ Review security event logs
  ☐ Check SW-420 mounting (not loose)
  ☐ Verify admin button accessibility
  ☐ Test full alert → acknowledge cycle

Yearly:
  ☐ Replace button if worn
  ☐ Check SW-420 for signs of damage
  ☐ Review sensitivity settings
  ☐ Audit all security incidents
```

### Performance Monitoring

```
Monitor in logs/dashboard:
  - Number of alerts per week
  - Average response time (alert to acknowledge)
  - False positive rate
  - Admin reaction time

Target metrics:
  - <2 false positives per week
  - <2 minutes response time
  - 100% system uptime
  - All incidents logged
```

---

## Part 9: Quick Reference

### Pin Summary
```
GPIO 26  → SW-420 DO (vibration detection)
GPIO 25  → Admin Button (acknowledgment)
GPIO 27  → Beeper (continuous 1s loop)
GPIO 4   → Door Sensor (existing)
GPIO 23  → Relay Lock (existing)
GND      → Common ground
3.3V     → SW-420 power
```

### State Machine
```
Locker Unlocked → Vibrations IGNORED
      ↓
Locker Locked → Vibrations MONITORED
      ↓
[Vibration Detected] → ALERT ACTIVE
      ↓
[Admin Button Pressed] → ALERT CLEARED
      ↓
Locker Locked → Vibrations MONITORED again
```

### MQTT Payloads
```
VIBRATION_ALERT  → Alert triggered
ACKNOWLEDGED     → Alert cleared by admin
IGNORE           → Alternative clear command
```

---

## Need Help?

1. **Wiring issues?** → See "Wiring Diagram" section
2. **Sensitivity problems?** → See "Sensitivity Tuning" section
3. **Beeper not working?** → See "Troubleshooting" section
4. **Frontend integration?** → See "FRONTEND_VIBRATION_INTEGRATION.md"
5. **Code integration?** → See "VIBRATION_INTEGRATION_SUMMARY.md"

---

## Files Created

1. **SW420_VIBRATION_SENSOR_GUIDE.md** - Detailed hardware guide
2. **VIBRATION_INTEGRATION_SUMMARY.md** - Code changes overview
3. **FRONTEND_VIBRATION_INTEGRATION.md** - App integration guide
4. **QUICK_SETUP_CARD.md** - Quick reference
5. **locker_controller.ino** - Updated firmware (vibration logic added)

---

## Next Steps

1. ✓ Hardware: Connect SW-420 and button (20 min)
2. ✓ Software: Firmware already updated (0 min - done)
3. ✓ Testing: Run test sequence (15 min)
4. ✓ Frontend: Integrate MQTT handling (varies)
5. ✓ Deployment: Test in production (1 hour)
6. ✓ Monitoring: Check logs daily for first week

Good luck! Your L1 locker now has professional break-in detection. 🔒

