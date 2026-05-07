#include <WiFi.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <Wire.h>
#include <math.h>
#include <HardwareSerial.h>
#include <TinyGPSPlus.h>
#include <MAX30105.h>
#include "heartRate.h"
#include "spo2_algorithm.h"
#include "activity_classifier.h"

// ─── WiFi & Backend ───────────────────────────────────────────────
const char* ssid       = "YOUR_WIFI_SSID";
const char* password   = "YOUR_WIFI_PASSWORD";
const char* serverName = "https://smarttouristsafety-vq1z.onrender.com/api/location/update";

// ─── Tourist ID ───────────────────────────────────────────────────
String touristId = "T-001"; // overwritten from flash in setup()

// ─── GPS ──────────────────────────────────────────────────────────
HardwareSerial gpsSerial(2);
TinyGPSPlus    gps;
double currentLat  = 0.0;
double currentLng  = 0.0;
double currentAlt  = 0.0;
bool   gpsValid    = false;
unsigned long lastGpsRead = 0;

// ─── SOS Button ───────────────────────────────────────────────────
#define BUTTON_PIN 4
volatile bool sosTriggered   = false;
unsigned long lastButtonPress = 0;
const unsigned long DEBOUNCE_MS = 300;

void IRAM_ATTR onButtonPress() {
  unsigned long now = millis();
  if (now - lastButtonPress > DEBOUNCE_MS) {
    sosTriggered    = true;
    lastButtonPress = now;
  }
}

// ─── MPU6050 ──────────────────────────────────────────────────────
#define MPU_ADDR 0x68
float magnitude         = 1.0f;
float rotationMagnitude = 0.0f;
float ay_raw            = 0.0f;

void readMPU() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 6, true);
  float ax = (int16_t)(Wire.read() << 8 | Wire.read()) / 16384.0f;
  float ay = (int16_t)(Wire.read() << 8 | Wire.read()) / 16384.0f;
  float az = (int16_t)(Wire.read() << 8 | Wire.read()) / 16384.0f;
  magnitude = sqrt(ax*ax + ay*ay + az*az);
  ay_raw    = ay;

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x43);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 6, true);
  float gx = (int16_t)(Wire.read() << 8 | Wire.read()) / 131.0f;
  float gy = (int16_t)(Wire.read() << 8 | Wire.read()) / 131.0f;
  float gz = (int16_t)(Wire.read() << 8 | Wire.read()) / 131.0f;
  rotationMagnitude = sqrt(gx*gx + gy*gy + gz*gz);
}

// ─── Fall detection state machine ─────────────────────────────────
static int   fallState          = 0;
static unsigned long stateStart = 0;
static unsigned long lowGStart  = 0;
static unsigned long fallCooldownUntil = 0;

// Returns true if a fall was just confirmed (call sendToBackend yourself)
bool updateFallDetection(unsigned long now) {
  switch (fallState) {
    case 0: // NORMAL
      if (magnitude < 0.4f) {
        if (lowGStart == 0) lowGStart = now;
        if (now - lowGStart > 150) {
          fallState  = 1;
          stateStart = now;
          lowGStart  = 0;
          Serial.println("[FALL] Free-fall phase");
        }
      } else {
        lowGStart = 0;
      }
      break;

    case 1: // FREE FALL — wait for impact
      if (magnitude > 2.5f && rotationMagnitude > 200.0f &&
          (now - stateStart < 1500)) {
        fallState  = 2;
        stateStart = now;
        Serial.println("[FALL] Impact detected");
      }
      if (now - stateStart > 2000) fallState = 0; // timeout
      break;

    case 2: // IMPACT — wait for stillness (person lying down)
      if (now - stateStart > 2500 &&
          magnitude > 0.9f && magnitude < 1.1f &&
          rotationMagnitude < 20.0f) {
        fallState         = 3;
        stateStart        = now;
        fallCooldownUntil = now + 15000;
        Serial.println("[FALL] CONFIRMED");
        return true; // caller sends FALL alert
      }
      if (now - stateStart > 3000) fallState = 0; // timeout
      break;

    case 3: // COOLDOWN — don't re-trigger for 15s
      if (now - stateStart > 15000) fallState = 0;
      break;
  }
  return false;
}

bool inFallCooldown(unsigned long now) {
  return now < fallCooldownUntil;
}

// ─── MAX30102 ─────────────────────────────────────────────────────
MAX30105 particleSensor;

// SpO2 algorithm buffers — 100 samples at 100Hz = 1 second of data
#define SPO2_BUF_SIZE 100
uint32_t irBuf[SPO2_BUF_SIZE];
uint32_t redBuf[SPO2_BUF_SIZE];
int32_t  spo2Value     = 0;
int8_t   spo2Valid     = 0;
int32_t  hrValue       = 0;   // from SpO2 algorithm
int8_t   hrValid_algo  = 0;

// What we actually send to backend
int  heartRate = 0;
bool hrValid   = false;

unsigned long lastHrRead = 0;
bool hrBufferReady       = false;

// Fill initial buffer — called once after sensor init
void initHrBuffer() {
  for (int i = 0; i < SPO2_BUF_SIZE; i++) {
    while (!particleSensor.available()) particleSensor.check();
    redBuf[i] = particleSensor.getRed();
    irBuf[i]  = particleSensor.getIR();
    particleSensor.nextSample();
  }
  hrBufferReady = true;
}

void readHeartRate() {
  // Only read when still — motion artifacts corrupt optical HR
  if (magnitude < 0.9f || magnitude > 1.1f) {
    hrValid = false;
    return;
  }

  // Quick check — if no finger on sensor, skip
  if (irBuf[SPO2_BUF_SIZE - 1] < 50000) {
    hrValid = false;
    return;
  }

  // Shift buffer: drop first 25, collect 25 fresh samples
  for (int i = 25; i < SPO2_BUF_SIZE; i++) {
    redBuf[i - 25] = redBuf[i];
    irBuf[i  - 25] = irBuf[i];
  }
  for (int i = 75; i < SPO2_BUF_SIZE; i++) {
    while (!particleSensor.available()) particleSensor.check();
    redBuf[i] = particleSensor.getRed();
    irBuf[i]  = particleSensor.getIR();
    particleSensor.nextSample();
  }

  maxim_heart_rate_and_oxygen_saturation(
    irBuf, SPO2_BUF_SIZE, redBuf,
    &spo2Value, &spo2Valid, &hrValue, &hrValid_algo
  );

  if (hrValid_algo && hrValue > 30 && hrValue < 220) {
    heartRate = (int)hrValue;
    hrValid   = true;
    Serial.printf("[HR] %d BPM | SpO2: %s%d%%\n",
      heartRate, spo2Valid ? "" : "~", spo2Valid ? spo2Value : 0);
  } else {
    hrValid = false;
  }
}

// ─── Activity (from classifier) ───────────────────────────────────
String currentActivity = "WALK";

// ─── Setup ────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  // SOS button
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), onButtonPress, FALLING);

  // GPS
  gpsSerial.begin(9600, SERIAL_8N1, 16, 17);

  // I2C
  Wire.begin(21, 22);

  // MPU6050 wake
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);
  Wire.write(0x00); // wake from sleep
  Wire.endTransmission(true);
  Serial.println("[INIT] MPU6050 ready");

  // MAX30102 init
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("[INIT] MAX30102 not found — check wiring. Halting.");
    while (1) delay(1000);
  }
  particleSensor.setup();
  particleSensor.setPulseAmplitudeRed(0x0A);
  particleSensor.setPulseAmplitudeIR(0x1F);
  particleSensor.setPulseAmplitudeGreen(0);
  Serial.println("[INIT] MAX30102 ready — filling HR buffer...");
  initHrBuffer();
  Serial.println("[INIT] HR buffer ready");

  // Tourist ID from flash
  {
    Preferences prefs;
    prefs.begin("toursafe", false);
    String stored = prefs.getString("tourist_id", "");
    if (stored.length() > 0) touristId = stored;
    prefs.end();
  }
  Serial.print("[INIT] Tourist ID: "); Serial.println(touristId);
  Serial.println("       Type SET_ID:T-003 to change");

  // WiFi
  WiFi.begin(ssid, password);
  Serial.print("[INIT] Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.println("\n[INIT] WiFi connected");
  Serial.println("[INIT] GPS initialising — waiting for fix...");
  Serial.println("[INIT] SOS button ready on D4");
}

// ─── Loop ─────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // ── Serial: SET_ID command ─────────────────────────────────────
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.startsWith("SET_ID:")) {
      String newId = cmd.substring(7);
      newId.trim();
      if (newId.length() > 0) {
        Preferences prefs;
        prefs.begin("toursafe", false);
        prefs.putString("tourist_id", newId);
        prefs.end();
        touristId = newId;
        Serial.print("[ID] Tourist ID set to: "); Serial.println(touristId);
      }
    }
  }

  // ── SOS — highest priority ─────────────────────────────────────
  if (sosTriggered) {
    sosTriggered = false;
    Serial.println("[SOS] Button pressed — sending emergency alert");
    sendToBackend("SOS");
    return;
  }

  // ── GPS ─────────────────────────────────────────────────────────
  while (gpsSerial.available()) gps.encode(gpsSerial.read());

  if (now - lastGpsRead > 5000) {
    lastGpsRead = now;
    if (gps.location.isValid()) {
      currentLat = gps.location.lat();
      currentLng = gps.location.lng();
      currentAlt = gps.altitude.meters();
      gpsValid   = true;
      Serial.printf("[GPS] %.6f, %.6f  Alt:%.1fm  Sats:%d\n",
        currentLat, currentLng, currentAlt, gps.satellites.value());
    } else {
      Serial.printf("[GPS] No fix | Sats:%d\n", gps.satellites.value());
    }
  }

  // ── MPU6050 — read, classify activity, detect fall ─────────────
  readMPU();
  currentActivity = classifyActivity(magnitude, rotationMagnitude, ay_raw);

  if (updateFallDetection(now)) {
    sendToBackend("FALL");
    return; // skip rest of loop this cycle
  }

  // ── MAX30102 — read heart rate every 10s when still ────────────
  if (now - lastHrRead > 10000) {
    lastHrRead = now;
    readHeartRate();
  }

  // ── Normal telemetry — every 5s, only when not in fall cooldown ─
  static unsigned long lastWalkSend = 0;
  if (now - lastWalkSend > 5000 && !inFallCooldown(now) && fallState == 0) {
    lastWalkSend = now;
    sendToBackend(currentActivity);
  }

  delay(40);
}

// ─── Send to Backend ──────────────────────────────────────────────
void sendToBackend(String activity) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Lost — reconnecting...");
    WiFi.reconnect();
    unsigned long t = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - t < 10000) {
      delay(500); Serial.print(".");
    }
    Serial.println();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WiFi] Reconnect failed — skipping send");
      return;
    }
    Serial.println("[WiFi] Reconnected");
  }

  HTTPClient http;
  http.begin(serverName);
  http.addHeader("Content-Type", "application/json");

  String json = "{";
  json += "\"touristId\":\"" + touristId + "\",";
  json += "\"latitude\":"   + String(currentLat, 6) + ",";
  json += "\"longitude\":"  + String(currentLng, 6) + ",";
  json += "\"activity\":\"" + activity + "\",";
  json += "\"altitude\":"   + String(currentAlt, 1) + ",";
  json += "\"heartRate\":"  + String(hrValid ? heartRate : 0);
  json += "}";

  int code = http.POST(json);
  Serial.printf("[SEND] %s | GPS:%s | HR:%s(%d) | HTTP:%d\n",
    activity.c_str(),
    gpsValid ? "REAL" : "NOFIX",
    hrValid  ? "OK"   : "none",
    hrValid  ? heartRate : 0,
    code);

  http.end();
}
