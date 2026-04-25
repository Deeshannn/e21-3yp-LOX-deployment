#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

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
const int ledPins[lockerCount] = {23, 18, 19, 25}; // L2–L4 LEDs (L1 uses relay, L4 moved to pin 25 for OLED)
const int ledBuiltin = 2;
const int doorSensorPin = 4;
const int doorIndicatorPin = 16; // External LED for L1 door open/close status

// OLED Display pins (I2C)
const int SDA_PIN = 21;
const int SCL_PIN = 22;
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// MQTT topics
char lockerControlTopics[lockerCount][64];
char lockerStateTopics[lockerCount][64];
char lockerDoorTopics[lockerCount][64];
char lockerBookingTopics[lockerCount][64];
char legacyControlTopics[lockerCount][64];
char legacyBookingTopics[lockerCount][64];

WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);

// Door state (only for L1)
String lastDoorState = "UNKNOWN";

// Locker 1 display states
String lockerStateDisplay = "LOCKED";
String lockerActionDisplay = "";
String doorStateDisplay = "CLOSED";
String lockerBookingDisplay = "FREE";
bool displayNeedsUpdate = true;

// ---------------- DISPLAY UPDATE (L1 ONLY) ----------------
void updateDisplay() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  
  // Title
  display.setTextSize(2);
  display.println("LOCKER 1");
  
  // Status
  display.setTextSize(1);
  display.print("State: ");
  display.println(lockerStateDisplay);
  
  // Action
  if (lockerActionDisplay.length() > 0) {
    display.print("Action: ");
    display.println(lockerActionDisplay);
  }
  
  // Door
  display.print("Door: ");
  display.println(doorStateDisplay);
  
  // Booking
  display.print("Status: ");
  display.println(lockerBookingDisplay);
  
  display.display();
}

// ---------------- APPLY STATE ----------------
void applyLockerState(int i, bool locked) {

  // 🔹 L1 → RELAY (same logic as L2-L4)
  if (i == 0) {
    if (locked) {
      digitalWrite(relayPin, LOW);   // OFF
      digitalWrite(ledBuiltin, LOW);
      lockerStateDisplay = "LOCKED";
      lockerActionDisplay = "";
    } else {
      digitalWrite(relayPin, HIGH);  // ON
      digitalWrite(ledBuiltin, HIGH);
      lockerStateDisplay = "UNLOCKED";
      lockerActionDisplay = "";
    }
    displayNeedsUpdate = true;
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
    
    // Update display
    doorStateDisplay = currentDoorState;
    displayNeedsUpdate = true;
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

  // Booking status updates for Locker 1 OLED (supports canonical + legacy topics)
  if (incomingTopic == lockerBookingTopics[0] || incomingTopic == legacyBookingTopics[0]) {
    if (message == "BOOKED" || message == "TRUE" || message == "1" || message == "YES" || message == "OCCUPIED") {
      lockerBookingDisplay = "BOOKED";
      displayNeedsUpdate = true;
    } else if (message == "FREE" || message == "FALSE" || message == "0" || message == "NO" || message == "AVAILABLE") {
      lockerBookingDisplay = "FREE";
      displayNeedsUpdate = true;
    }
  }

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
        mqttClient.subscribe(lockerBookingTopics[i]);
        mqttClient.subscribe(legacyBookingTopics[i]);

        Serial.printf("Subscribed: %s\n", lockerControlTopics[i]);
        Serial.printf("Subscribed (legacy): %s\n", legacyControlTopics[i]);
        Serial.printf("Subscribed booking: %s\n", lockerBookingTopics[i]);
        Serial.printf("Subscribed booking (legacy): %s\n", legacyBookingTopics[i]);
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

    snprintf(lockerBookingTopics[i], sizeof(lockerBookingTopics[i]),
             "locker/%s/booking", lockerCodes[i]);

    // Legacy topic (locker/1/control)
    const char* codePart = lockerCodes[i];
    if (lockerCodes[i][0] == 'L') {
      codePart = lockerCodes[i] + 1;
    }

    snprintf(legacyControlTopics[i], sizeof(legacyControlTopics[i]),
             "locker/%s/control", codePart);

    snprintf(legacyBookingTopics[i], sizeof(legacyBookingTopics[i]),
           "locker/%s/booking", codePart);

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

  // Initialize OLED Display
  Wire.begin(SDA_PIN, SCL_PIN);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED initialization failed!");
  } else {
    Serial.println("OLED initialized successfully");
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("LOCKER 1");
    display.println("Initializing...");
    display.display();
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
  
  // Update display if needed
  if (displayNeedsUpdate) {
    updateDisplay();
    displayNeedsUpdate = false;
  }
}
