package com.safety.service;

import com.safety.dto.LocationDTO;
import com.safety.model.Alert;
import com.safety.model.LocationHistory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class AnomalyDetector {

    // --- Tunable thresholds (use testing-friendly defaults, revert later) ---
    private static final double INACTIVITY_DISTANCE_METERS = 5.0;   // 5 m for testing
    private static final long INACTIVITY_SECONDS = 5;               // 5 s for testing
    private static final double SPEED_THRESHOLD_KMH = 5.0;          // 5 km/h for testing
    private static final double SUDDEN_JUMP_METERS = 200.0;         // 200 m for testing

    // Now accept previous record (can be null)
    public List<Alert> detect(LocationDTO dto, LocationHistory previous) {
        List<Alert> alerts = new ArrayList<>();

        if (previous == null) {
            // nothing to compare to — but still check heart-rate
            if (dto.getHeartRate() != null) {
                int hr = dto.getHeartRate();
                if (hr > 160) {
                    alerts.add(new Alert(dto.getTouristId(), "CRITICAL",
                            "Critical heart rate detected: " + hr + " bpm", LocalDateTime.now()));
                } else if (hr > 120) {
                    alerts.add(new Alert(dto.getTouristId(), "MEDIUM",
                            "High heart rate detected: " + hr + " bpm", LocalDateTime.now()));
                }
            }
            System.out.println("🛈 No previous location — skipping distance/speed checks");
            return alerts;
        }

        double distance = haversine(previous.getLatitude(), previous.getLongitude(),
                dto.getLatitude(), dto.getLongitude());
        Duration timeDiff = Duration.between(previous.getTimestamp(), LocalDateTime.now());
        long seconds = Math.max(1, timeDiff.getSeconds());
        double hours = seconds / 3600.0;
        double speedKmh = (distance / 1000.0) / hours;

        System.out.println(String.format("🛰️ prev: (%.6f,%.6f) @%s  now: (%.6f,%.6f)  dist=%.1fm  time=%ds  speed=%.1fkm/h",
                previous.getLatitude(), previous.getLongitude(), previous.getTimestamp(),
                dto.getLatitude(), dto.getLongitude(), distance, seconds, speedKmh));

        // 1) inactivity
        if (distance < INACTIVITY_DISTANCE_METERS && seconds > INACTIVITY_SECONDS) {
            alerts.add(new Alert(dto.getTouristId(), "MEDIUM",
                    "Inactivity detected: no movement for " + (seconds / 60.0) + " minutes", LocalDateTime.now()));
        }

        // 2) sudden speed
        if (speedKmh > SPEED_THRESHOLD_KMH) {
            alerts.add(new Alert(dto.getTouristId(), "HIGH",
                    "Sudden speed detected: " + String.format("%.1f", speedKmh) + " km/h", LocalDateTime.now()));
        }

        // 3) unrealistic jump
        if (distance > SUDDEN_JUMP_METERS) {
            alerts.add(new Alert(dto.getTouristId(), "HIGH",
                    "Unrealistic jump: moved " + String.format("%.1f", distance) + " m instantly", LocalDateTime.now()));
        }

        // 4) heart-rate (repeat here for safety)
        if (dto.getHeartRate() != null) {
            int hr = dto.getHeartRate();
            if (hr > 160) {
                alerts.add(new Alert(dto.getTouristId(), "CRITICAL",
                        "Critical heart rate detected: " + hr + " bpm", LocalDateTime.now()));
            } else if (hr > 120) {
                alerts.add(new Alert(dto.getTouristId(), "MEDIUM",
                        "High heart rate detected: " + hr + " bpm", LocalDateTime.now()));
            }
        }

        return alerts;
    }

    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371000; // meters
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
