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

// MQTT topics
const char* lockerCode = "L1";
const char* lockerControlTopic = "locker/1/control";
const char* lockerStateTopic = "locker/1/state";

// Pins
const int relayPin = 23;     // Relay for solenoid lock
const int ledBuiltin = 2;    // ESP32 built-in LED
const int doorSensorPin = 4; // Magnetic sensor: HIGH=open, LOW=closed (adjust as needed)

WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);
String lastDoorState = "UNKNOWN";

void applyLockerState(bool locked) {
  // Active-low relay: LOW energizes relay, HIGH de-energizes relay.
  if (locked) {
    digitalWrite(relayPin, HIGH);
    digitalWrite(ledBuiltin, LOW);
    mqttClient.publish(lockerStateTopic, "LOCKED", true);
  } else {
    digitalWrite(relayPin, LOW);
    digitalWrite(ledBuiltin, HIGH);
    mqttClient.publish(lockerStateTopic, "UNLOCKED", true);
  }
}

void publishDoorState() {
  String currentDoorState = digitalRead(doorSensorPin) == HIGH ? "OPEN" : "CLOSED";
  if (currentDoorState != lastDoorState) {
    mqttClient.publish(lockerStateTopic, currentDoorState.c_str(), true);
    lastDoorState = currentDoorState;
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  message.trim();
  message.toUpperCase();

  if (String(topic) != lockerControlTopic) {
    return;
  }

  if (message == "LOCK") {
    applyLockerState(true);
  } else if (message == "UNLOCK") {
    applyLockerState(false);
  }
}

void connectWifi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Wi-Fi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void connectMqtt() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT...");

    String clientId = String("esp32-locker-") + lockerCode;

    if (mqttClient.connect(clientId.c_str(), mqttUser, mqttPassword)) {
      Serial.println("connected");
      mqttClient.subscribe(lockerControlTopic);
      applyLockerState(true);  // Default state on connect: locked
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retrying in 3s");
      delay(3000);
    }
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(relayPin, OUTPUT);
  pinMode(ledBuiltin, OUTPUT);
  pinMode(doorSensorPin, INPUT_PULLUP);
  applyLockerState(true);

  connectWifi();

  // For quick setup with HiveMQ Cloud TLS. For production, use proper CA certs.
  wifiClient.setInsecure();
  mqttClient.setServer(mqttServer, mqttPort);
  mqttClient.setCallback(mqttCallback);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }

  if (!mqttClient.connected()) {
    connectMqtt();
  }

  mqttClient.loop();
  publishDoorState();
  delay(50);
}
