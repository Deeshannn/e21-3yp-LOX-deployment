# Frontend Integration Guide - Vibration Alert Handling

## MQTT Topics & Payloads

### Security Topic Subscription
**Topic**: `locker/L1/security`

**Possible Payloads**:
```
- ALERT              // Old door-open alert
- VIBRATION_ALERT    // New vibration detected alert
- ACKNOWLEDGED       // Alert has been acknowledged by admin
```

---

## Frontend Alert States

### 1. Normal State
```
User View:
- Locker card shows: "Status: LOCKED" or "Status: UNLOCKED"
- No warning messages
- No sound alerts

Admin View:
- Same as user
- No admin action needed
```

### 2. Vibration Alert Active
```
User View (Continuously):
├─ Visual Warning
│  ├─ Red border around locker card
│  ├─ Blinking "VIBRATION ALERT!" text
│  ├─ Icon: ⚠️ Break-in attempt
│  └─ Message: "WARNING: Unusual vibration detected!"
│
├─ Audio Notification
│  ├─ Short beep sound (optional browser notification sound)
│  └─ Beeper on locker hardware: 1-second on/off loop
│
└─ Action Available: NONE (user cannot dismiss)

Admin View (Continuously):
├─ Visual Warning (same as user)
│  ├─ Red border around locker card
│  ├─ Blinking "VIBRATION ALERT!" text
│  └─ Message: "Break-in attempt detected on L1"
│
├─ Audio Notification
│  ├─ Alert sound/notification tone
│  └─ Beeper on locker hardware: 1-second on/off loop
│
└─ Action Available: [ACKNOWLEDGE] button
   - Hidden from users
   - Only visible to admin
   - Visible in admin panel/dashboard
```

### 3. Alert Acknowledged
```
Both User & Admin View:
├─ Visual State returns to normal
├─ Red warning disappears
├─ Beeper stops
├─ Display shows normal status again
└─ History/Log entry created for audit
```

---

## Frontend Implementation Example

### React Component Structure (Conceptual)

```jsx
// LockerCard.jsx
import React, { useState, useEffect } from 'react';

const LockerCard = ({ lockerId, mqttData }) => {
  const [vibrationAlert, setVibrationAlert] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    const securityPayload = mqttData[`locker/${lockerId}/security`];
    
    if (securityPayload === 'VIBRATION_ALERT') {
      setVibrationAlert(true);
      setAcknowledged(false);
      playAlertSound(); // Optional
    } else if (securityPayload === 'ACKNOWLEDGED') {
      setVibrationAlert(false);
      setAcknowledged(true);
    }
  }, [mqttData]);

  const handleAcknowledge = () => {
    // Admin button - hidden from users
    if (isAdminUser) {
      publishMqttMessage(`locker/${lockerId}/security`, 'IGNORE');
      setVibrationAlert(false);
    }
  };

  return (
    <div className={vibrationAlert ? 'locker-card alert' : 'locker-card'}>
      <h3>{lockerId}</h3>
      
      {vibrationAlert && (
        <div className="vibration-alert">
          <div className="blinking-warning">⚠️ VIBRATION ALERT!</div>
          <p>Break-in attempt detected</p>
          <p className="message">
            {isAdminUser 
              ? "Unusual vibration detected. Press button to acknowledge."
              : "Security breach detected. Admin has been notified."}
          </p>
        </div>
      )}

      <div className="status">
        <p>State: {mqttData[`locker/${lockerId}/state`]}</p>
        <p>Booking: {mqttData[`locker/${lockerId}/booking`]}</p>
      </div>

      {isAdminUser && vibrationAlert && (
        <button 
          className="acknowledge-btn" 
          onClick={handleAcknowledge}
        >
          ACKNOWLEDGE ALERT
        </button>
      )}
    </div>
  );
};

export default LockerCard;
```

### CSS Styling

```css
.locker-card {
  border: 2px solid #ccc;
  padding: 16px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.locker-card.alert {
  border-color: #ff4444;
  background-color: #ffe6e6;
  box-shadow: 0 0 10px rgba(255, 68, 68, 0.3);
}

.vibration-alert {
  margin: 12px 0;
  padding: 12px;
  background-color: #ffcccc;
  border-left: 4px solid #ff4444;
}

.blinking-warning {
  font-size: 20px;
  font-weight: bold;
  color: #ff4444;
  animation: blink 1s infinite;
  margin-bottom: 8px;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.3; }
}

.message {
  color: #333;
  font-size: 14px;
  margin: 4px 0;
}

.acknowledge-btn {
  background-color: #4CAF50;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  margin-top: 12px;
}

.acknowledge-btn:hover {
  background-color: #45a049;
}

.acknowledge-btn:active {
  background-color: #3d8b40;
}
```

---

## MQTT Flow Sequence

```
Timeline:

T=0s   Vibration detected on locker hardware
       └─ triggerSecurityAlarm()
          └─ vibrationDetected = true
          └─ securityAlarmActive = true
          └─ Beeper: ON
          └─ MQTT: Publish "VIBRATION_ALERT"

T=0.5s Frontend receives MQTT update
       └─ setVibrationAlert(true)
       └─ Show red warning card
       └─ Display "VIBRATION ALERT!" (blinking)

T=1s   Beeper off (updateSecurityAlarm toggles)
T=2s   Beeper on again

T=2s   Frontend shows continuous alert
       └─ User panel: Warning visible (can't dismiss)
       └─ Admin panel: Warning + ACKNOWLEDGE button visible

T=30s  User sees alert, notifies admin via phone/radio
       └─ Alert message continuously on card

T=35s  Admin presses physical button on locker
       └─ checkAdminButton() detects press
       └─ clearSecurityAlarm(true)
          └─ vibrationDetected = false
          └─ securityAlarmActive = false
          └─ Beeper: OFF
          └─ MQTT: Publish "ACKNOWLEDGED"

T=35.5s Frontend receives ACKNOWLEDGED update
        └─ setVibrationAlert(false)
        └─ Red card returns to normal
        └─ Warning disappears
        └─ Admin button becomes hidden

T=40s  Everything normal again
       └─ Locker resumes standard operation
       └─ Next vibration triggers new alert
```

---

## User vs Admin Notification Strategy

### User Receives:
1. **Visual Alert** - Red card with warning text
2. **Continuous Message** - "Security breach detected. Admin notified."
3. **Cannot Dismiss** - No button to hide alert
4. **Audio Cue** - Optional notification sound from browser

### Admin Receives:
1. **Visual Alert** - Same as user
2. **Additional Info** - "Acknowledge to clear alert"
3. **Action Button** - "ACKNOWLEDGE ALERT" (visible to admin only)
4. **Audio Cue** - Distinct alert sound
5. **Direct Control** - Can also press physical button on hardware

---

## Handling Edge Cases

### Case 1: Multiple Alerts
```
If door + vibration both trigger:
- Door alert triggers first
- Vibration detected while locked with door open
- Same alarm state (vibrationDetected = true, or door open)
- Single alert shown (consolidated)
- Single ACKNOWLEDGE clears both
```

### Case 2: Admin Presses Button While Unlocking
```
Sequence:
1. Admin presses button → clearSecurityAlarm(true)
2. Admin sends UNLOCK command → applyLockerState(0, false)
3. User accesses locker
4. Vibrations now ignored (locker is unlocked)
```

### Case 3: False Positive (Admin Dismisses But Door Still Open)
```
Sequence:
1. Admin acknowledges → clearSecurityAlarm()
2. But door sensor still reads OPEN
3. publishDoorState() called next loop
4. If door still OPEN, trigggerSecurityAlarm("Door open") again
5. Alert re-triggers (proper behavior - door truly open)
```

---

## Logging & Auditing

### Events to Log

```javascript
// In frontend or backend
logSecurityEvent({
  timestamp: new Date(),
  lockerId: 'L1',
  eventType: 'VIBRATION_ALERT',
  triggered: true,
  reason: 'Vibration detected while locker locked'
});

logSecurityEvent({
  timestamp: new Date(),
  lockerId: 'L1',
  eventType: 'VIBRATION_ALERT',
  acknowledged: true,
  acknowledgedBy: 'admin_user_id',
  durationSeconds: 35
});
```

### Report Example
```
Security Event Log for L1
─────────────────────────────────
2024-04-27 14:32:15 → Vibration Alert Triggered
2024-04-27 14:32:15 → User: Notified
2024-04-27 14:32:15 → Admin: Notified
2024-04-27 14:32:50 → Admin: Acknowledged (Duration: 35s)

Status: RESOLVED ✓
Response Time: 35 seconds
```

---

## Testing Checklist for Frontend

- [ ] MQTT message with "VIBRATION_ALERT" arrives and triggers alert
- [ ] Red warning appears on locker card
- [ ] "VIBRATION ALERT!" text blinks continuously
- [ ] User cannot dismiss the alert
- [ ] Admin sees ACKNOWLEDGE button
- [ ] Admin can click button to dismiss alert
- [ ] Clicking button publishes IGNORE command to MQTT
- [ ] Frontend receives ACKNOWLEDGED payload
- [ ] Warning disappears and card returns to normal
- [ ] Alert can be triggered again after clearing
- [ ] Multiple alert cycles work (trigger → acknowledge → trigger again)
- [ ] Works on mobile and desktop views
- [ ] Audio notification (if implemented) plays on alert
- [ ] Blinking animation continues until dismissed
- [ ] History/Log entry created for each event

