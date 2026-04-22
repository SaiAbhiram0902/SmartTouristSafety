package com.safety.service;

import com.safety.dto.LocationDTO;
import com.safety.model.Alert;
import com.safety.model.LocationHistory;
import com.safety.repository.AlertRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Service
public class AnomalyDetector {

    @Autowired
    private AlertRepository alertRepository;

    // Movement thresholds
    private static final double INACTIVITY_DISTANCE_METERS = 10.0;
    private static final long   INACTIVITY_SECONDS         = 300;
    private static final double SPEED_THRESHOLD_KMH        = 40.0;
    private static final double SUDDEN_JUMP_METERS         = 500.0;

    // Heart rate thresholds
    private static final int HR_CRITICAL      = 160;
    private static final int HR_HIGH_ACTIVE   = 150;
    private static final int HR_HIGH_STILL    = 100;
    private static final int HR_LOW_DANGEROUS = 45;

    // Altitude risk bands (metres above sea level)
    private static final double ALT_MODERATE = 1000.0;
    private static final double ALT_HIGH     = 2000.0;

    // Deduplication cooldowns — minimum minutes between repeated alerts of the same type
    // per tourist. Prevents alert spam when a condition persists across many location updates.
    private static final int COOLDOWN_CRITICAL_MIN  = 5;
    private static final int COOLDOWN_HIGH_MIN      = 5;
    private static final int COOLDOWN_MEDIUM_MIN    = 10;
    private static final int COOLDOWN_INACTIVITY_MIN = 10;
    private static final int COOLDOWN_SPEED_MIN     = 2;
    private static final int COOLDOWN_ZONE_MIN      = 5;  // used by LocationService

    public List<Alert> detect(LocationDTO dto, LocationHistory previous) {
        List<Alert> alerts = new ArrayList<>();

        String activity  = dto.getActivity() != null ? dto.getActivity().toUpperCase() : "WALK";
        boolean isMoving = activity.equals("WALK") || activity.equals("RUN") || activity.equals("CLIMB");
        boolean isStill  = activity.equals("STILL");
        boolean justFell = activity.equals("FALL");
        boolean isSOS    = activity.equals("SOS");

        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Kolkata"));

        // Altitude context
        double altitude = dto.getAltitude() != null ? dto.getAltitude() : 0.0;
        int altBoost = 0;
        String altNote = "";
        if (altitude >= ALT_HIGH) {
            altBoost = 10;
            altNote  = " [HIGH ALTITUDE: " + String.format("%.0f", altitude) + "m — rescue very difficult]";
        } else if (altitude >= ALT_MODERATE) {
            altBoost = 5;
            altNote  = " [MODERATE ALTITUDE: " + String.format("%.0f", altitude) + "m]";
        }

        // ── Heart rate checks ─────────────────────────────────────────────
        if (dto.getHeartRate() != null) {
            int hr = dto.getHeartRate();

            if (hr > HR_CRITICAL) {
                if (notRecentlySeen(dto.getTouristId(), "CRITICAL", COOLDOWN_CRITICAL_MIN, now)) {
                    Alert a = new Alert();
                    a.setTouristId(dto.getTouristId());
                    a.setType("CRITICAL");
                    a.setMessage("Critical heart rate: " + hr + " bpm — immediate attention required" + altNote);
                    a.setSeverity(Math.min(100, 95 + altBoost));
                    a.setTimestamp(now);
                    alerts.add(a);
                }

            } else if (hr > HR_HIGH_ACTIVE && isMoving) {
                if (notRecentlySeen(dto.getTouristId(), "MEDIUM", COOLDOWN_MEDIUM_MIN, now)) {
                    Alert a = new Alert();
                    a.setTouristId(dto.getTouristId());
                    a.setType("MEDIUM");
                    a.setMessage("Elevated heart rate during activity: " + hr + " bpm");
                    a.setSeverity(50);
                    a.setTimestamp(now);
                    alerts.add(a);
                }

            } else if (hr > HR_HIGH_STILL && isStill) {
                if (notRecentlySeen(dto.getTouristId(), "HIGH", COOLDOWN_HIGH_MIN, now)) {
                    Alert a = new Alert();
                    a.setTouristId(dto.getTouristId());
                    a.setType("HIGH");
                    a.setMessage("High heart rate while stationary: " + hr + " bpm — possible medical concern" + altNote);
                    a.setSeverity(Math.min(100, 80 + altBoost));
                    a.setTimestamp(now);
                    alerts.add(a);
                }

            } else if (hr < HR_LOW_DANGEROUS) {
                if (notRecentlySeen(dto.getTouristId(), "CRITICAL", COOLDOWN_CRITICAL_MIN, now)) {
                    int base = justFell ? 100 : 85;
                    String context = justFell
                            ? " after detected fall — possible unconsciousness"
                            : " — possible medical emergency";
                    Alert a = new Alert();
                    a.setTouristId(dto.getTouristId());
                    a.setType("CRITICAL");
                    a.setMessage("Dangerously low heart rate: " + hr + " bpm" + context + altNote);
                    a.setSeverity(Math.min(100, base + altBoost));
                    a.setTimestamp(now);
                    alerts.add(a);
                }
            }
        }

        // SOS and FALL skip movement checks — they're handled directly in LocationService
        if (isSOS || justFell) {
            return alerts;
        }

        if (previous == null) {
            return alerts;
        }

        double distance = haversine(
                previous.getLatitude(), previous.getLongitude(),
                dto.getLatitude(), dto.getLongitude());
        Duration timeDiff = Duration.between(previous.getTimestamp(), now);
        long seconds = Math.max(1, timeDiff.getSeconds());
        double speedKmh = (distance / 1000.0) / (seconds / 3600.0);

        System.out.printf("Anomaly | tourist=%s | activity=%s | alt=%.0fm | dist=%.1fm | speed=%.1fkm/h%n",
                dto.getTouristId(), activity, altitude, distance, speedKmh);

        // ── Inactivity check ──────────────────────────────────────────────
        if (distance < INACTIVITY_DISTANCE_METERS && seconds > INACTIVITY_SECONDS) {
            if (notRecentlySeen(dto.getTouristId(), "MEDIUM", COOLDOWN_INACTIVITY_MIN, now)) {
                boolean hrElevated = dto.getHeartRate() != null && dto.getHeartRate() > HR_HIGH_STILL;
                int severity = hrElevated ? 80 : 60;
                String hrNote = hrElevated ? " with elevated HR (" + dto.getHeartRate() + " bpm)" : "";
                Alert a = new Alert();
                a.setTouristId(dto.getTouristId());
                a.setType("MEDIUM");
                a.setMessage("No movement for " + (seconds / 60) + " minutes" + hrNote + altNote);
                a.setSeverity(Math.min(100, severity + altBoost));
                a.setTimestamp(now);
                alerts.add(a);
            }
        }

        // ── Speed check ───────────────────────────────────────────────────
        if (speedKmh > SPEED_THRESHOLD_KMH && isMoving) {
            if (notRecentlySeen(dto.getTouristId(), "HIGH", COOLDOWN_SPEED_MIN, now)) {
                Alert a = new Alert();
                a.setTouristId(dto.getTouristId());
                a.setType("HIGH");
                a.setMessage("Suspicious speed: " + String.format("%.1f", speedKmh) + " km/h");
                a.setSeverity(75);
                a.setTimestamp(now);
                alerts.add(a);
            }
        }

        // ── GPS jump check ────────────────────────────────────────────────
        if (distance > SUDDEN_JUMP_METERS) {
            if (notRecentlySeen(dto.getTouristId(), "HIGH", COOLDOWN_SPEED_MIN, now)) {
                Alert a = new Alert();
                a.setTouristId(dto.getTouristId());
                a.setType("HIGH");
                a.setMessage("Large location jump: " + String.format("%.1f", distance) + "m in "
                        + seconds + "s — possible GPS error");
                a.setSeverity(75);
                a.setTimestamp(now);
                alerts.add(a);
            }
        }

        return alerts;
    }

    /**
     * Returns true if NO alert of the given type has been raised for this tourist
     * within the last cooldownMinutes minutes.
     * This is the deduplication gate — call before adding any alert.
     */
    public boolean notRecentlySeen(String touristId, String type, int cooldownMinutes,
                                   LocalDateTime now) {
        LocalDateTime cutoff = now.minusMinutes(cooldownMinutes);
        return !alertRepository.existsByTouristIdAndTypeAndTimestampAfter(touristId, type, cutoff);
    }

    // Exposed so LocationService can use the same deduplication for ZONE alerts
    public static final int ZONE_COOLDOWN_MIN = 5;

    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
