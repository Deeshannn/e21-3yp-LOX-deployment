#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

// Wi-Fi credentials
const char* ssid = "HUAWEI-E8372-3A0F";
const char* password = "55529256";

// MQTT broker settings
const char* mqttServer = "3e037e542d2944a3ae4266e4d6f6c874.s1.eu.hivemq.cloud";
const int mqttPort = 8883;
const char* mqttUser = "smartlocker";
const char* mqttPassword = "Chamikaudu415";

// -------- LOCKER SETUP --------
const int lockerCount = 4;
const char* lockerCodes[lockerCount] = {"L1", "L2", "L3", "L4"};

// Pins
const int relayPin = 23;   // L1 real lock
const int ledPins[lockerCount] = {23, 18, 19, 21}; // L2–L4 LEDs (L1 uses relay)
const int ledBuiltin = 2;
const int doorSensorPin = 4;
const int doorIndicatorPin = 16; // External LED for L1 door open/close status

// MQTT topics
char lockerControlTopics[lockerCount][64];
char lockerStateTopics[lockerCount][64];
char lockerDoorTopics[lockerCount][64];
char legacyControlTopics[lockerCount][64];

WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);

// Door state (only for L1)
String lastDoorState = "UNKNOWN";

// ---------------- APPLY STATE ----------------
void applyLockerState(int i, bool locked) {

  // 🔹 L1 → RELAY (keep EXACT behavior)
  if (i == 0) {
    if (locked) {
      digitalWrite(relayPin, HIGH); // OFF
      digitalWrite(ledBuiltin, LOW);
    } else {
      digitalWrite(relayPin, LOW);  // ON
      digitalWrite(ledBuiltin, HIGH);
    }
  }

  // 🔹 L2–L4 → LEDs
  else {
    if (locked) {
      digitalWrite(ledPins[i], LOW);   // OFF
    } else {
      digitalWrite(ledPins[i], HIGH);  // ON
    }
  }

  // Publish state
  if (locked) {
    mqttClient.publish(lockerStateTopics[i], "LOCKED", true);
  } else {
    mqttClient.publish(lockerStateTopics[i], "UNLOCKED", true);
  }
}

// ---------------- DOOR SENSOR (L1 ONLY) ----------------
void publishDoorState() {
  String currentDoorState = digitalRead(doorSensorPin) == HIGH ? "OPEN" : "CLOSED";

  if (currentDoorState == "OPEN") {
    digitalWrite(doorIndicatorPin, HIGH);
  } else {
    digitalWrite(doorIndicatorPin, LOW);
  }

  if (currentDoorState != lastDoorState) {
    Serial.printf("Door sensor: %s -> publishing %s to %s\n", currentDoorState.c_str(), currentDoorState.c_str(), lockerDoorTopics[0]);
    mqttClient.publish(lockerDoorTopics[0], currentDoorState.c_str(), true);
    lastDoorState = currentDoorState;
  }
}

// ---------------- MQTT CALLBACK ----------------
void mqttCallback(char* topic, byte* payload, unsigned int length) {

  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  message.trim();
  message.toUpperCase();

  Serial.printf("MQTT msg topic=%s payload=%s\n", topic, message.c_str());

  String incomingTopic = String(topic);

  for (int i = 0; i < lockerCount; i++) {

    if (incomingTopic == lockerControlTopics[i] ||
        incomingTopic == legacyControlTopics[i]) {

      if (message == "LOCK") {
        applyLockerState(i, true);
      } else if (message == "UNLOCK") {
        applyLockerState(i, false);
      }
    }
  }
}

// ---------------- WIFI ----------------
void connectWifi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWi-Fi connected");
  Serial.println(WiFi.localIP());
}

// ---------------- MQTT ----------------
void connectMqtt() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT...");

    if (mqttClient.connect("esp32-multi-locker", mqttUser, mqttPassword)) {
      Serial.println("connected");

      for (int i = 0; i < lockerCount; i++) {
        mqttClient.subscribe(lockerControlTopics[i]);
        mqttClient.subscribe(legacyControlTopics[i]);

        Serial.printf("Subscribed: %s\n", lockerControlTopics[i]);
        Serial.printf("Subscribed (legacy): %s\n", legacyControlTopics[i]);
        Serial.printf("Door topic: %s\n", lockerDoorTopics[i]);

        applyLockerState(i, true); // default LOCKED
      }

    } else {
      Serial.print("failed, rc=");
      Serial.println(mqttClient.state());
      delay(3000);
    }
  }
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);

  for (int i = 0; i < lockerCount; i++) {

    // Topics
    snprintf(lockerControlTopics[i], sizeof(lockerControlTopics[i]),
             "locker/%s/control", lockerCodes[i]);

    snprintf(lockerStateTopics[i], sizeof(lockerStateTopics[i]),
             "locker/%s/state", lockerCodes[i]);

    snprintf(lockerDoorTopics[i], sizeof(lockerDoorTopics[i]),
         "locker/%s/door", lockerCodes[i]);

    // Legacy topic (locker/1/control)
    const char* codePart = lockerCodes[i];
    if (lockerCodes[i][0] == 'L') {
      codePart = lockerCodes[i] + 1;
    }

    snprintf(legacyControlTopics[i], sizeof(legacyControlTopics[i]),
             "locker/%s/control", codePart);

    Serial.printf("Locker: %s\n", lockerCodes[i]);
    Serial.printf("Topic: %s\n", lockerControlTopics[i]);
  }

  // Pin setup
  pinMode(relayPin, OUTPUT);
  pinMode(ledBuiltin, OUTPUT);
  pinMode(doorSensorPin, INPUT_PULLUP);
  pinMode(doorIndicatorPin, OUTPUT);
  digitalWrite(doorIndicatorPin, LOW);

  for (int i = 1; i < lockerCount; i++) {
    pinMode(ledPins[i], OUTPUT);
  }

  connectWifi();

  wifiClient.setInsecure();
  mqttClient.setServer(mqttServer, mqttPort);
  mqttClient.setCallback(mqttCallback);
}

// ---------------- LOOP ----------------
void loop() {

  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }

  if (!mqttClient.connected()) {
    connectMqtt();
  }

  mqttClient.loop();
  publishDoorState();
}
