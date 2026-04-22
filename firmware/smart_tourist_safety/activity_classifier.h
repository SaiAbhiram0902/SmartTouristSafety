// activity_classifier.h
// Drop into your sketch folder alongside smart_tourist_safety.ino
// Uncomment #include "activity_classifier.h" in the sketch when MPU6050 is soldered
//
// Classifies activity from MPU6050 accelerometer + gyroscope data
// Returns: "STILL", "WALK", "RUN", or "CLIMB"
// NOTE: "FALL" is NOT returned here — the fall state machine handles that separately
//       and overrides this classification when confirmed

#ifndef ACTIVITY_CLASSIFIER_H
#define ACTIVITY_CLASSIFIER_H

// Thresholds — tuned for wrist-worn MPU6050, adjust after real testing
#define STILL_MAG_MIN      0.85f   // magnitude close to 1g = gravity only = stationary
#define STILL_MAG_MAX      1.15f
#define STILL_ROT_MAX      15.0f   // low rotation = not moving
#define WALK_VAR_MIN       0.05f   // variance range for walking steps
#define WALK_VAR_MAX       0.40f
#define RUN_VAR_MIN        0.40f   // high variance = running
#define RUN_ROT_MIN        50.0f   // running also has high rotation
#define CLIMB_TILT_MIN     0.26f   // ay > sin(15 degrees) = forward tilt = climbing

// Rolling variance window — short window captures step-to-step variation
#define VAR_WINDOW 10
static float magBuf[VAR_WINDOW] = {0};
static int   bufIdx = 0;
static bool  bufFull = false;

void updateBuffer(float magnitude) {
    magBuf[bufIdx % VAR_WINDOW] = magnitude;
    bufIdx++;
    if (bufIdx >= VAR_WINDOW) bufFull = true;
}

float getVariance() {
    if (!bufFull && bufIdx < VAR_WINDOW) return 0.0f;
    float sum = 0, sumSq = 0;
    for (int i = 0; i < VAR_WINDOW; i++) {
        sum   += magBuf[i];
        sumSq += magBuf[i] * magBuf[i];
    }
    float mean = sum / VAR_WINDOW;
    return (sumSq / VAR_WINDOW) - (mean * mean);
}

// Call every loop iteration with current MPU readings
// magnitude       = sqrt(ax^2 + ay^2 + az^2) in g
// rotationMag     = sqrt(gx^2 + gy^2 + gz^2) in degrees/sec
// ay              = raw Y-axis acceleration in g (for climb tilt detection)
String classifyActivity(float magnitude, float rotationMag, float ay) {
    updateBuffer(magnitude);
    float variance = getVariance();

    // Need full window before classifying reliably
    if (!bufFull) return "WALK";

    // STILL — low variance, close to 1g, minimal rotation
    if (variance < WALK_VAR_MIN &&
        magnitude > STILL_MAG_MIN &&
        magnitude < STILL_MAG_MAX &&
        rotationMag < STILL_ROT_MAX) {
        return "STILL";
    }

    // CLIMB — moderate variance like walking, but with forward Y-axis tilt
    // Ascending stairs or steep incline tilts the wrist forward
    if (variance >= WALK_VAR_MIN &&
        variance <  RUN_VAR_MIN  &&
        ay > CLIMB_TILT_MIN) {
        return "CLIMB";
    }

    // RUN — high variance AND high rotation (energetic, whole-arm movement)
    if (variance >= RUN_VAR_MIN && rotationMag >= RUN_ROT_MIN) {
        return "RUN";
    }

    // WALK — default for moderate movement
    return "WALK";
}

#endif
