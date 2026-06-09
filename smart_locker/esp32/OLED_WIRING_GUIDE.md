# OLED Display Wiring Guide for ESP32 Locker Controller

## Display Information
- **Module**: Blue 0.96" OLED Display (SSD1306)
- **Resolution**: 128×64 pixels
- **Interface**: I2C (Two-wire)
- **Default Address**: 0x3C

## Pin Assignments

### OLED Display Pins
The display has 4 pins labeled on the board:

| Display Pin | Label | ESP32 Pin | Function |
|---|---|---|---|
| 1 | GND | GND | Ground |
| 2 | VCC | 3V3 | Power (3.3V) |
| 3 | SCL | GPIO 22 | I2C Clock Line |
| 4 | SDA | GPIO 21 | I2C Data Line |

### Important Notes on Pin Changes
⚠️ **Pin Conflict Resolution**:
- Original code used GPIO 21 for L4 LED
- Updated code moved L4 LED from GPIO 21 → **GPIO 25**
- This allows GPIO 21 and GPIO 22 to be used for I2C communication with the OLED

## Wiring Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    ESP32 Board                          │
│                                                         │
│  3V3 ├───────────────────────┐                         │
│                              │                         │
│  GND ├───────────────────────┼─────────┐               │
│                              │         │               │
│  GPIO 22 (SCL) ├─────────────┤         │               │
│                              │         │               │
│  GPIO 21 (SDA) ├─────────────┤         │               │
│                              │         │               │
└─────────────────────────────────────────────────────────┘
                               │         │
                        ┌──────▼─────────▼──────┐
                        │  0.96" OLED Display   │
                        │  (SSD1306)            │
                        │                       │
                        │ VCC  GND  SCL  SDA   │
                        └───────────────────────┘
```

## Step-by-Step Connection Instructions

### Materials Needed
- ESP32 Development Board
- 0.96" OLED Display Module (SSD1306)
- 4 Jumper Wires (Female-to-Female recommended)

### Connection Steps

1. **Power Connections**
   - Connect OLED **VCC** → ESP32 **3V3** (3.3V power)
   - Connect OLED **GND** → ESP32 **GND** (ground)

2. **I2C Data Line (SDA)**
   - Connect OLED **SDA** → ESP32 **GPIO 21**
   - This pin is now free (L4 LED moved to GPIO 25)

3. **I2C Clock Line (SCL)**
   - Connect OLED **SCL** → ESP32 **GPIO 22**

4. **Verification**
   - Ensure all connections are secure
   - No loose wires or short circuits
   - Power connections should be solid

## Wiring Reference Table

| Connection | From | To |
|---|---|---|
| Power | ESP32 3V3 | OLED VCC |
| Ground | ESP32 GND | OLED GND |
| Data | ESP32 GPIO 21 | OLED SDA |
| Clock | ESP32 GPIO 22 | OLED SCL |

## Updated Pin Configuration

```cpp
// OLED Display pins (I2C)
const int SDA_PIN = 21;
const int SCL_PIN = 22;

// Updated LED Pins (L4 moved from 21 to 25)
const int ledPins[lockerCount] = {23, 18, 19, 25};
```

## Library Installation (Arduino IDE)

The updated code requires these libraries. Install them via Arduino IDE:

1. **Adafruit GFX Library**
   - Search: "Adafruit GFX"
   - Author: Adafruit Industries
   - Link: https://github.com/adafruit/Adafruit-GFX-Library

2. **Adafruit SSD1306**
   - Search: "Adafruit SSD1306"
   - Author: Adafruit Industries
   - Link: https://github.com/adafruit/Adafruit_SSD1306

**Installation Steps**:
- Open Arduino IDE
- Go to **Sketch** → **Include Library** → **Manage Libraries...**
- Search for each library and click **Install**

## OLED Display Features

The integrated display shows Locker 1 status in real-time:

### Display Information
- **LOCKER 1**: Title (always visible)
- **State**: LOCKED / UNLOCKED
- **Action**: LOCKING / UNLOCKING (when state is changing)
- **Door**: OPEN / CLOSED (from door sensor)
- **Status**: FREE / BOOKED

### Example Display States

```
LOCKER 1
State: LOCKED
Door: CLOSED
Status: FREE

---

LOCKER 1
State: UNLOCKED
Action: LOCKING
Door: OPEN
Status: BOOKED
```

## Troubleshooting

### Display Not Showing Anything
- Check power connections (3V3 and GND)
- Verify I2C address is 0x3C (default for this module)
- Check for loose jumper wires
- Try using different jumper wires

### I2C Communication Error
- Ensure GPIO 21 and GPIO 22 are not used elsewhere
- Verify the Wire.begin(SDA_PIN, SCL_PIN) matches pin connections
- Check if other devices share the I2C bus

### L4 LED Not Working
- L4 LED is now on GPIO 25 (changed from GPIO 21)
- Check GPIO 25 pin connections if L4 LED was previously working
- Verify in ledPins array: `{23, 18, 19, 25}`

## I2C Address Detection

If the display doesn't initialize, you can scan for I2C address:

```cpp
#include <Wire.h>

void scanI2C() {
  for(byte i = 0; i < 128; i++) {
    Wire.beginTransmission(i);
    if(Wire.endTransmission() == 0) {
      Serial.print("Found device at 0x");
      Serial.println(i, HEX);
    }
  }
}
```

Add this to your setup() to identify the correct address if different from 0x3C.

## Safe Pin Reference for ESP32

Available pins that don't conflict:
- GPIO 2 (onboard LED - already used)
- GPIO 4 (door sensor - already used)
- GPIO 5, 12, 13, 14, 15, 25, 26, 27, 32, 33 (general purpose)

**Avoid using**: 0, 6-11, 16, 17 (reserved for flash memory)

## No Existing Functionality Damaged ✅

The following systems remain **completely unchanged**:
- ✅ WiFi connectivity
- ✅ MQTT communication
- ✅ L1 relay control
- ✅ L2, L3 LED controls
- ✅ Door sensor functionality
- ✅ All MQTT topics and subscriptions
- ✅ Built-in LED indicator (pin 2)
- ✅ Door indicator LED (pin 16)

Only **L4 LED pin changed** from GPIO 21 → GPIO 25 (no functional impact, just physical location)
