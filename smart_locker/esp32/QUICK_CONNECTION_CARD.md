# Quick Connection Reference Card

## 4-Wire Connection (Print This!)

```
╔═══════════════════════════════════════════════════════════╗
║          OLED Display to ESP32 Connection Card           ║
╚═══════════════════════════════════════════════════════════╝

   OLED Display        →        ESP32 Board
   
   ┌─────────────┐              ┌─────────────┐
   │ VCC (Red)   │─────────────→│ 3V3         │
   │ GND (Black) │─────────────→│ GND         │
   │ SDA (Green) │─────────────→│ GPIO 21     │
   │ SCL (White) │─────────────→│ GPIO 22     │
   └─────────────┘              └─────────────┘

╔═══════════════════════════════════════════════════════════╗
║                 WIRE COLOR CONVENTION                    ║
╠═══════════════════════════════════════════════════════════╣
║ RED     → Power (VCC/3V3)                                ║
║ BLACK   → Ground (GND)                                   ║
║ GREEN   → Data (SDA)                                     ║
║ WHITE   → Clock (SCL)                                    ║
║                                                           ║
║ Note: Your wires may be different colors - focus on      ║
║ the function (PWR, GND, SDA, SCL) not the color         ║
╚═══════════════════════════════════════════════════════════╝
```

## Connection Checklist

- [ ] **VCC Wire**: OLED VCC pin → ESP32 3V3 pin (red wire typically)
- [ ] **GND Wire**: OLED GND pin → ESP32 GND pin (black wire typically)
- [ ] **SDA Wire**: OLED SDA pin → ESP32 GPIO 21 (data line)
- [ ] **SCL Wire**: OLED SCL pin → ESP32 GPIO 22 (clock line)

## ESP32 Board Pinout Reference

```
┌─────────────────────────────────────────────────────┐
│                    ESP32 Board                      │
│                                                     │
│  3V3 ●                                          ● GND
│  EN  ●                                          ● D23
│  SVN ●                                          ● D19
│  SVP ●                                          ● D18
│  D34 ●                                          ● D5
│  D35 ●                                          ● D17
│  D32 ●                                          ● D16
│  D33 ●                                          ● D4
│  D25 ●  (L4 LED)                                ● D2
│  D26 ●                                          ● D15
│  D27 ●                                          ● D14
│  D14 ●                                          ● D13
│  D12 ●                                          ● D12
│  GND ●                                          ● GND
│  D13 ●                                          ● D11
│  D9  ●                                          ● D10
│  D10 ●                                          ● D9
│  D6  ●                                          ● D6
│  D7  ●                                          ● D7
│  D8  ●                                          ● D8
│  D19 ●                                          ● D1 (TX)
│  D23 ●                                          ● D0 (RX)
│                                                     
│      │                                             │
│      └─ GPIO 21 (SDA for OLED)                     │
│      └─ GPIO 22 (SCL for OLED)                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Step-by-Step Connection

### Step 1: Power
Connect a jumper wire from:
- **OLED VCC** → **ESP32 3V3** (top-left area of board)

### Step 2: Ground
Connect a jumper wire from:
- **OLED GND** → **ESP32 GND** (bottom-left area of board)

### Step 3: I2C Data (SDA)
Connect a jumper wire from:
- **OLED SDA** → **ESP32 GPIO 21** (middle-right area)

### Step 4: I2C Clock (SCL)
Connect a jumper wire from:
- **OLED SCL** → **ESP32 GPIO 22** (middle-right area, below GPIO 21)

## Before You Start

### Have These Ready:
- [ ] ESP32 Development Board
- [ ] 0.96" OLED Display Module (SSD1306)
- [ ] 4 Jumper Wires (Female-to-Female)
- [ ] Optional: USB cable for programming

### Safety Checks:
- [ ] ESP32 is NOT powered (remove USB if connected)
- [ ] No loose wires that could short circuit
- [ ] All connections are secure before powering on

## Power On Sequence

1. **Connect all 4 jumper wires** while board is unpowered
2. **Plug in USB cable** to ESP32
3. **Watch the OLED display**
   - Should show "LOCKER 1" and "Initializing..."
   - Then show the lock status

## What You Should See

### Initial Boot (First 3 seconds)
```
LOCKER 1
Initializing...
```

### Normal Operation
```
LOCKER 1
State: LOCKED
Door: CLOSED
Status: FREE
```

## Troubleshooting Quick Guide

| Symptom | First Check |
|---------|------------|
| Display is blank | Check 3V3 power connection |
| Display shows garbage | Check GPIO 21 & 22 connections |
| Serial shows "OLED failed" | Check all 4 wires are connected |
| Display works then stops | Check WiFi didn't reset connections |

## Emergency Disconnect

If the display stops working:
1. Unplug USB cable immediately
2. Check all 4 wire connections
3. Look for loose or damaged wires
4. Reconnect USB after verification

## Default Settings (Do Not Change)

- **Display Address**: 0x3C (default for this module)
- **I2C Speed**: 400kHz
- **Display Size**: 128×64 pixels
- **Refresh Rate**: ~60ms

## Contact Pins on OLED Board

Looking at the back of the OLED module, pins are labeled:
```
[GND] [VCC] [SCL] [SDA]
  1     2     3     4
```

Connect from left to right:
- Pin 1 (GND) → ESP32 GND
- Pin 2 (VCC) → ESP32 3V3
- Pin 3 (SCL) → ESP32 GPIO 22
- Pin 4 (SDA) → ESP32 GPIO 21

## Still Need Help?

See the detailed guides:
- **OLED_WIRING_GUIDE.md** - Complete wiring instructions
- **OLED_INTEGRATION_SUMMARY.md** - Features and troubleshooting
- **locker_controller.ino** - Updated source code

---

**Last Updated**: April 25, 2026
**Status**: Ready for Connection ✅
