#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

// ─────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────

// Wi-Fi
const char* ssid     = "HUAWEI-E8372-3A0F";
const char* password = "55529256";

// MQTT broker
const char* mqttServer   = "3e037e542d2944a3ae4266e4d6f6c874.s1.eu.hivemq.cloud";
const int   mqttPort     = 8883;
const char* mqttUser     = "smartlocker";
const char* mqttPassword = "Chamikaudu415";

// Station this ESP32 belongs to
const char* stationId = "STN-001";

// ─────────────────────────────────────────────────────────
// LOCKER CONFIG
// Each row: { lockerID, relayPin, sensorPin }
// Add a new row to add a new locker
// ─────────────────────────────────────────────────────────
struct LockerConfig {
  const char* lockerId;
  int         relayPin;
  int         sensorPin;
};

LockerConfig lockers[] = {
  { "L-001", 23, 4  },
  { "L-002", 22, 5  },
  { "L-003", 21, 18 },
  { "L-004", 19, 16 }
};

const int LOCKER_COUNT = sizeof(lockers) / sizeof(lockers[0]);

// Track last door state per locker to detect changes
String lastDoorState[4];   // matches LOCKER_COUNT

// ─────────────────────────────────────────────────────────
// MQTT CLIENT
// ─────────────────────────────────────────────────────────
WiFiClientSecure wifiClient;
PubSubClient     mqttClient(wifiClient);


// ─────────────────────────────────────────────────────────
// LOCK CONTROL
// ─────────────────────────────────────────────────────────
void applyLockerState(int index, bool locked) {
  // Active-low relay: LOW energizes, HIGH de-energizes
  digitalWrite(lockers[index].relayPin, locked ? HIGH : LOW)

  // Build state topic: locker/{stationId}/{lockerId}/state
  char stateTopic[64];
  snprintf(stateTopic, sizeof(stateTopic),
           "locker/%s/%s/state", stationId, lockers[index].lockerId);

  mqttClient.publish(stateTopic, locked ? "LOCKED" : "UNLOCKED", true);

  Serial.printf("[%s] Lock → %s\n", lockers[index].lockerId, locked ? "LOCKED" : "UNLOCKED");
}


// ─────────────────────────────────────────────────────────
// DOOR SENSOR — publish only on state change
// ─────────────────────────────────────────────────────────
void publishDoorState(int index) {
  String current = digitalRead(lockers[index].sensorPin) == HIGH ? "OPEN" : "CLOSED";

  if (current != lastDoorState[index]) {
    char stateTopic[64];
    snprintf(stateTopic, sizeof(stateTopic),
             "locker/%s/%s/state", stationId, lockers[index].lockerId);

    mqttClient.publish(stateTopic, current.c_str(), true);
    lastDoorState[index] = current;

    Serial.printf("[%s] Door → %s\n", lockers[index].lockerId, current.c_str());
  }
}


// ─────────────────────────────────────────────────────────
// MQTT CALLBACK — receives LOCK / UNLOCK commands
// Topic format: locker/{stationId}/{lockerId}/control
// ─────────────────────────────────────────────────────────
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  message.trim();
  message.toUpperCase();

  Serial.printf("MQTT received [%s]: %s\n", topic, message.c_str());

  // Match topic to a locker
  for (int i = 0; i < LOCKER_COUNT; i++) {
    char controlTopic[64];
    snprintf(controlTopic, sizeof(controlTopic),
             "locker/%s/%s/control", stationId, lockers[i].lockerId);

    if (String(topic) == String(controlTopic)) {
      if (message == "UNLOCK") {
        applyLockerState(i, false);
      } else if (message == "LOCK") {
        applyLockerState(i, true);
      }
      return;
    }
  }
}


// ─────────────────────────────────────────────────────────
// WIFI
// ─────────────────────────────────────────────────────────
void connectWifi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\nWi-Fi connected. IP: %s\n", WiFi.localIP().toString().c_str());
}


// ─────────────────────────────────────────────────────────
// MQTT CONNECT — subscribes to all locker control topics
// ─────────────────────────────────────────────────────────
void connectMqtt() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT...");

    // Unique client ID per station
    String clientId = String("esp32-") + stationId;

    if (mqttClient.connect(clientId.c_str(), mqttUser, mqttPassword)) {
      Serial.println("connected");

      // Subscribe to control topic for every locker
      for (int i = 0; i < LOCKER_COUNT; i++) {
        char controlTopic[64];
        snprintf(controlTopic, sizeof(controlTopic),
                 "locker/%s/%s/control", stationId, lockers[i].lockerId);

        mqttClient.subscribe(controlTopic);
        Serial.printf("Subscribed to %s\n", controlTopic);

        // Default state on connect — all lockers locked
        applyLockerState(i, true);
      }

    } else {
      Serial.printf("failed rc=%d, retrying in 3s\n", mqttClient.state());
      delay(3000);
    }
  }
}


// ─────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  // Initialize all relay and sensor pins
  for (int i = 0; i < LOCKER_COUNT; i++) {
    pinMode(lockers[i].relayPin,  OUTPUT);
    pinMode(lockers[i].sensorPin, INPUT_PULLUP);
    lastDoorState[i] = "UNKNOWN";
  }

  connectWifi();

  wifiClient.setInsecure();   // HiveMQ Cloud quick setup
  mqttClient.setServer(mqttServer, mqttPort);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512);
}


// ─────────────────────────────────────────────────────────
// LOOP
// ─────────────────────────────────────────────────────────
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }

  if (!mqttClient.connected()) {
    connectMqtt()
  }

  mqttClient.loop();

  // Check door state for every locker
  for (int i = 0; i < LOCKER_COUNT; i++) {
    publishDoorState(i);
  }

  delay(50);
}