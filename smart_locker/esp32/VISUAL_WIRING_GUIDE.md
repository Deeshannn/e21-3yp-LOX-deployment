# SW-420 Vibration Sensor - Visual Reference Guide

## ESP32 Pin Layout (Full Diagram)

```
                    ESP32 DevKit (30-pin version)
                    ┌─────────────────────┐
                    │                     │
        GND ────────┤ GND         3.3V ───┤────── SW-420 VCC (power)
        GND ────────┤ GND         EN  ───┤
        (unused)────┤ D35         SVP ───┤
        (unused)────┤ D34         SVN ───┤
        (unused)────┤ D39         D32 ───┤
        (unused)────┤ D36         D33 ───┤
        (unused)────┤ D4* (door)  D25 ───┤────── LED L4 (unused - can use for button)
        (unused)────┤ D2  (LED)   D26 ───┤────── SW-420 DO (vibration sensor input) ✓
        (unused)────┤ D15         D27 ───┤────── BEEPER
        (unused)────┤ D8          D14 ───┤
        (unused)────┤ D7          D12 ───┤
        (unused)────┤ D6          GND ───┤────── Admin button pin 2
        (unused)────┤ D11         D13 ───┤
        (unused)────┤ D5          D9  ───┤
        (unused)────┤ D3          D10 ───┤
        (unused)────┤ D1          D23 ───┤────── RELAY (L1 lock)
        (unused)────┤ D22 (SCL)   D19 ───┤────── LED L3 (unused)
        (unused)────┤ D21 (SDA)   GND ───┤────── Common ground
        (unused)────┤ GND         D18 ───┤────── LED L2
        (unused)────┤ D17         D5  ───┤
                    │                     │
                    └─────────────────────┘
                    
Legend:
  ✓ = Vibration sensor integration
  * = Door sensor (already integrated)
  
Color coding (wires):
  RED    = 3.3V power
  BLACK  = GND (ground)
  GREEN  = GPIO 26 (signal)
  BLUE   = GPIO 25 (button signal)
  YELLOW = Beeper (GPIO 27)
```

---

## Wiring Table (Simple Reference)

| Component | Pin | Signal | Wire Color | Connected To |
|-----------|-----|--------|-----------|--------------|
| **SW-420 Sensor** |  |  |  |  |
| VCC | - | Power | RED | ESP32 3.3V |
| GND | - | Ground | BLACK | ESP32 GND |
| DO | 26 | Signal | GREEN | ESP32 GPIO 26 |
| **Admin Button** |  |  |  |  |
| Pin 1 | 25 | Signal | BLUE | ESP32 GPIO 25 |
| Pin 2 | - | Ground | BLACK | ESP32 GND |

---

## Wiring Schematic (Simplified)

```
POWER DISTRIBUTION
──────────────────

┌─ ESP32 3.3V
│   ├─ RED wire ──→ SW-420 VCC
│   └─ (used for power)
│
└─ ESP32 GND
    ├─ BLACK wire ──→ SW-420 GND
    ├─ BLACK wire ──→ Admin Button (pin 2)
    └─ (common ground for all components)


SIGNAL LINES
────────────

SW-420 Module               ESP32 Board
    │                           │
    ├─ VCC ═══RED═══════════ 3.3V
    │
    ├─ GND ═══BLACK════════ GND
    │
    └─ DO ────GREEN──────→ GPIO 26 (INPUT)


Admin Button
    │
    ├─ Pin 1 ════BLUE────→ GPIO 25 (INPUT_PULLUP)
    │
    └─ Pin 2 ════BLACK───→ GND


Beeper (Already connected - no changes)
    │
    └─ GPIO 27 (OUTPUT)

Door Sensor (Already connected - no changes)
    │
    └─ GPIO 4 (INPUT_PULLUP)
```

---

## Physical Layout (Top-Down View)

```
┌─────────────────────────────────────────────────┐
│               Control Panel (Admin Area)         │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  Lock/Unlock Panel                      │   │
│  │  ├─ Locker L1 Status Display            │   │
│  │  ├─ Locker L1 Controls                  │   │
│  │  └─ [ACKNOWLEDGE ALERT] Button ← HIDDEN│   │
│  │      (only visible when alert active)   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  ESP32 Controller Box                   │   │
│  │  ┌─────────────────────────────────────┐│   │
│  │  │ GPIO Connections:                   ││   │
│  │  │ • GPIO 26 ← Vibration sensor (wire) ││   │
│  │  │ • GPIO 25 ← Button wire (from below)││   │
│  │  │ • GPIO 27 → Beeper (wire)           ││   │
│  │  │ • GPIO 4  ← Door sensor (wire)      ││   │
│  │  │ • GPIO 23 → Relay (wire)            ││   │
│  │  │ • GND ← Common ground (wire)        ││   │
│  │  │ • 3.3V → SW-420 power (wire)        ││   │
│  │  └─────────────────────────────────────┘│   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘

        ↓ Wire runs down to locker
        
┌─────────────────────────────────────────────────┐
│               L1 Locker Unit                     │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │                                          │  │
│  │  SW-420 Sensor                          │  │
│  │  ┌─────────────────┐                    │  │
│  │  │ [Sensor Module] │ ← Mounted inside   │  │
│  │  │ (VCC, GND, DO)  │   on locker body   │  │
│  │  └─────────────────┘                    │  │
│  │         ↑                                │  │
│  │    Wire bundle                          │  │
│  │  (RED, BLACK, GREEN)                    │  │
│  │    Runs to: GPIO 26, GND, 3.3V          │  │
│  │                                          │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  Beeper: Inside locker or mounted nearby       │
│  Door Sensor: On locker door frame             │
│  Relay: Controls the lock                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Connection Checklist (Physical)

**Pre-Connection Safety**:
- [ ] ESP32 powered OFF
- [ ] All wires laid out (no tangles)
- [ ] Correct color coding identified
- [ ] Correct GPIO pins identified

**Connection Steps**:

```
Step 1: Power
  [ ] RED wire:   3.3V → SW-420 VCC
  [ ] BLACK wire: GND → SW-420 GND

Step 2: Signal
  [ ] GREEN wire: GPIO 26 → SW-420 DO

Step 3: Button
  [ ] BLUE wire:  GPIO 25 → Button pin 1
  [ ] BLACK wire: GND → Button pin 2

Step 4: Verification
  [ ] No loose connections
  [ ] No wire crossings/shorts
  [ ] Red and Black properly separated
  [ ] All 3 wires to SW-420 connected
  [ ] Button has 2 connections (signal + ground)

Step 5: Power On
  [ ] ESP32 receives power
  [ ] OLED display initializes
  [ ] Beeper test sounds (2 beeps)
  [ ] Serial monitor shows setup messages
```

---

## Potentiometer Adjustment Guide

The SW-420 module has a small tuning dial on the PCB:

```
                    SW-420 Module (Top View)
                    ┌──────────────────┐
                    │                  │
                    │  ╱╲ Potentiometer│
                    │  ──────────      │
                    │  (sensitivity)   │
                    │                  │
                    │ VCC ┌─ GND ┌─ DO│
                    └─────┴──────┴────┘

Sensitivity Scale:
  
  Counter-Clockwise (LESS sensitive)
         ↓
  ┌─────────────┐
  │      0      │  
  │  9   ●   3  │  ← Current position (example)
  │  6   .   .  │  
  └─────────────┘
         ↑
  Clockwise (MORE sensitive)

Target Position: 12 o'clock (straight up) = Middle sensitivity
  - Adjust from there based on testing
  - Counter-clockwise = Reduce false positives
  - Clockwise = Improve detection
```

---

## Signal Flow Diagram

```
PHYSICAL WORLD → SENSOR → PROCESSING → ACTION

Event: Vibration
  ↓
SW-420 detects shake
  ↓
SW-420 outputs: Digital HIGH (on GPIO 26)
  ↓
ESP32 reads: digitalRead(GPIO 26) = HIGH
  ↓
checkVibrationSensor() function runs:
  if (locker is LOCKED && vibration detected) {
    ├─ Set: vibrationDetected = true
    ├─ Set: securityAlarmActive = true
    ├─ Call: triggerSecurityAlarm()
    │  ├─ Beeper ON (GPIO 27)
    │  └─ Display "WARNING!" on OLED
    └─ Publish: MQTT message "VIBRATION_ALERT"
  }
  ↓
Beeper active (1-second on/off cycle)
Display shows: "WARNING! Vibration! Break-in attempt?"
MQTT sent to dashboard
User & Admin notified
  ↓
Admin sees alert in app
Admin presses physical button (GPIO 25)
  ↓
checkAdminButton() function runs:
  digitalRead(GPIO 25) = LOW (button pressed)
  ↓
Call: clearSecurityAlarm(true)
  ├─ Set: securityAlarmActive = false
  ├─ Set: vibrationDetected = false
  ├─ Beeper OFF (GPIO 27)
  ├─ Display back to normal
  └─ Publish: MQTT message "ACKNOWLEDGED"
  ↓
Frontend receives "ACKNOWLEDGED"
Alert cleared from dashboard
Everything returns to normal
```

---

## Current vs Updated Pin Configuration

```
BEFORE (Locker 3 & 4 removed):
  GPIO 23 → Relay (L1)
  GPIO 18 → LED (L2)
  GPIO 19 → LED (L3) - REMOVED
  GPIO 25 → LED (L4) - REMOVED

AFTER (With vibration sensor):
  GPIO 23 → Relay (L1)           [unchanged]
  GPIO 18 → LED (L2)             [unchanged]
  GPIO 19 → (available)          [now free]
  GPIO 25 → Admin Button         [reassigned]
  GPIO 26 → Vibration Sensor DO  [new]
  GPIO 27 → Beeper               [unchanged]
  GPIO 4  → Door Sensor          [unchanged]
```

---

## Assembly Instructions (Step-by-Step)

### Tools Needed
- Jumper wires (quality recommended)
- Breadboard (optional, if testing first)
- Small screwdriver (for potentiometer tuning)
- Multimeter (for testing connections)

### Assembly Order

```
1. Identify all components
   ☐ ESP32 board (with firmware loaded)
   ☐ SW-420 vibration sensor module
   ☐ Momentary push button
   ☐ Jumper wires (minimum 4x)
   ☐ Mounting supplies (tape, screws, etc.)

2. Prepare ESP32 (powered off)
   ☐ Clear work area
   ☐ Ground yourself (avoid static)
   ☐ Identify GPIO pins: 26, 25, 27, 4, 23
   ☐ Identify power pins: 3.3V, GND

3. Connect SW-420
   ☐ 3.3V → VCC (red wire)
   ☐ GND → GND (black wire)
   ☐ GPIO 26 → DO (green wire)
   ☐ Verify 3 connections

4. Connect Admin Button
   ☐ GPIO 25 → Pin 1 (blue wire)
   ☐ GND → Pin 2 (black wire)
   ☐ Verify 2 connections

5. Organize wires
   ☐ Use cable ties or clips
   ☐ Keep power (red) separate from signals (green, blue)
   ☐ Avoid sharp bends
   ☐ Label wires if needed

6. Mount sensor
   ☐ Identify locker mounting location
   ☐ Clean surface (use rubbing alcohol)
   ☐ Apply double-sided tape or small screws
   ☐ Mount SW-420 securely (no movement)
   ☐ Test by hand-shaking: no loose vibrations

7. Mount button
   ☐ Identify admin-only location
   ☐ Secure button in place
   ☐ Test pressing: should require intentional force
   ☐ Ensure accessibility for quick pressing

8. Final check
   ☐ All connections solid (tug each wire)
   ☐ No exposed contacts
   ☐ Power off before first startup
```

---

## LED/Light Indicators (What to Look For)

```
ESP32 Board (when powered):
  LED 1 (Power)     │ Always ON
  LED 2 (Built-in)  │ OFF normally, ON when unlocked (GPIO 2)

OLED Display:
  Startup:          │ "LOCKER 1 Initializing..."
  Normal:           │ Status, state, booking, door
  Alert:            │ "WARNING! Vibration! Break-in attempt?"
  
Beeper:
  Startup:          │ BEEP (1s) + silence (0.5s) + BEEP (1s) = Test
  Alert active:     │ BEEP-BEEP... (alternating every 1s)
  Acknowledged:     │ Stops immediately

Serial Monitor (115200 baud):
  Looking for:      │ "OLED initialized"
                    │ "MQTT connected"
                    │ "VIBRATION DETECTED" (on alert)
                    │ "Admin ignore button pressed!" (on acknowledge)
```

---

## Troubleshooting Visual Checklist

```
Visual Inspection:

No power?
  ☐ Check USB cable to ESP32
  ☐ Check power indicator LED
  ☐ Try different USB port

Wires disconnected?
  ☐ Tug each wire gently (should not wiggle)
  ☐ Check connections at both ends
  ☐ Look for bent pins

Button not working?
  ☐ Press firmly (some buttons need force)
  ☐ Listen for "click" sound
  ☐ Check if button feels stuck or rough

Sensor not detecting?
  ☐ Tap firmly on sensor module (should detect)
  ☐ Watch for response in serial monitor
  ☐ Check if locker state is LOCKED (required)

OLED display wrong?
  ☐ Check I2C connections (GPIO 21, 22)
  ☐ Look for "WARNING" text on alert
  ☐ Verify power LED is on

Beeper always on/off?
  ☐ Check GPIO 27 connection
  ☐ Verify beeper voltage/polarity
  ☐ Test with separate power if needed
```

