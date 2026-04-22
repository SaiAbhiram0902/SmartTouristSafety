package com.safety.controller;

import com.safety.model.Alert;
import com.safety.service.AlertService;
import com.safety.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    @Autowired private AlertService alertService;
    @Autowired private SimpMessagingTemplate messagingTemplate;
    @Autowired private NotificationService notificationService;

    // GET all alerts — admin dashboard
    @GetMapping
    public ResponseEntity<List<Alert>> getAllAlerts() {
        return ResponseEntity.ok(alertService.getAllAlerts());
    }

    // GET alerts for one tourist — tourist app
    @GetMapping("/{touristId}")
    public ResponseEntity<List<Alert>> getAlertsForTourist(@PathVariable String touristId) {
        return ResponseEntity.ok(alertService.getAlertsForTourist(touristId));
    }

    // PATCH /api/alerts/{id}/resolve — mark alert as resolved
    // Persists to DB, broadcasts updated alert over WebSocket so dashboard pins update live
    @PatchMapping("/{id}/resolve")
    public ResponseEntity<?> resolveAlert(@PathVariable Long id) {
        try {
            Alert alert = alertService.resolveAlert(id);
            messagingTemplate.convertAndSend("/topic/alerts", alert);
            return ResponseEntity.ok(alert);
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    // POST /api/alerts — called by tourist app SOS modal and IoT pipeline
    // Body: { touristId, type, severity, message }
    @PostMapping
    public ResponseEntity<?> createAlert(@RequestBody Map<String, Object> body) {
        try {
            Alert a = new Alert();
            a.setTouristId((String) body.get("touristId"));

            String rawType = (String) body.getOrDefault("type", "SOS");
            String alertType = switch (rawType.toUpperCase()) {
                case "SOS"      -> "CRITICAL";
                case "MEDICAL"  -> "HIGH";
                case "WILDLIFE" -> "HIGH";
                case "LOST"     -> "HIGH";
                default         -> rawType;
            };
            a.setType(alertType);

            String typeLabel = switch (rawType.toUpperCase()) {
                case "SOS"      -> "[SOS] Emergency";
                case "MEDICAL"  -> "[MEDICAL] Help needed";
                case "WILDLIFE" -> "[WILDLIFE] Threat reported";
                case "LOST"     -> "[LOST] Tourist stranded";
                default         -> rawType;
            };
            String rawMessage = (String) body.getOrDefault("message", "");
            a.setMessage(rawMessage.isBlank() ? typeLabel : typeLabel + ": " + rawMessage);
            a.setTimestamp(LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata")));

            Object sevRaw = body.get("severity");
            if (sevRaw instanceof Integer) {
                a.setSeverity((Integer) sevRaw);
            } else {
                a.setSeverity(severityToScore(rawType));
            }

            // Store coordinates if provided and append to message for FLY TO to work
            Object latRaw = body.get("latitude");
            Object lonRaw = body.get("longitude");
            if (latRaw instanceof Number && lonRaw instanceof Number) {
                double lat = ((Number) latRaw).doubleValue();
                double lon = ((Number) lonRaw).doubleValue();
                a.setLatitude(lat);
                a.setLongitude(lon);
                String coordStr = " (" + String.format("%.6f", lat) + ", " + String.format("%.6f", lon) + ")";
                if (!a.getMessage().contains(coordStr)) {
                    a.setMessage(a.getMessage() + coordStr);
                }
            }

            Alert saved = alertService.save(a);
            messagingTemplate.convertAndSend("/topic/alerts", saved);

            String upper = rawType.toUpperCase();
            if (upper.equals("SOS") || upper.equals("MEDICAL") || upper.equals("WILDLIFE") || upper.equals("LOST")) {
                notificationService.sendEmergencyAlert(saved.getTouristId(), saved);
            }

            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    private int severityToScore(String s) {
        return switch (s.toUpperCase()) {
            case "SOS"      -> 98;
            case "WILDLIFE" -> 85;
            case "MEDICAL"  -> 80;
            case "LOST"     -> 75;
            case "CRITICAL" -> 95;
            case "HIGH"     -> 75;
            case "MEDIUM"   -> 50;
            case "LOW"      -> 25;
            default         -> 90;
        };
    }
}
