package com.safety.service;

import com.safety.dto.LocationDTO;
import com.safety.dto.LocationResponse;
import com.safety.model.Alert;
import com.safety.model.LocationHistory;
import com.safety.model.Zone;
import com.safety.repository.AlertRepository;
import com.safety.repository.LocationHistoryRepository;
import com.safety.repository.ZoneRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class LocationService {

    @Autowired private LocationHistoryRepository locationHistoryRepository;
    @Autowired private ZoneRepository zoneRepository;
    @Autowired private AlertRepository alertRepository;
    @Autowired private SimpMessagingTemplate messagingTemplate;
    @Autowired private AnomalyDetector anomalyDetector;
    @Autowired private NotificationService notificationService;

    public LocationResponse processLocation(LocationDTO dto) {

        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Kolkata"));

        LocationHistory previous = locationHistoryRepository
                .findTopByTouristIdOrderByTimestampDesc(dto.getTouristId());

        List<Alert> anomalies = anomalyDetector.detect(dto, previous);

        // ── Persist location ──────────────────────────────────────────────
        LocationHistory history = new LocationHistory();
        history.setTouristId(dto.getTouristId());
        history.setLatitude(dto.getLatitude());
        history.setLongitude(dto.getLongitude());
        history.setActivity(dto.getActivity());
        history.setHeartRate(dto.getHeartRate());
        history.setAltitude(dto.getAltitude());
        history.setTimestamp(now);
        LocationHistory saved = locationHistoryRepository.save(history);

        // ── Push live location to dashboard map ───────────────────────────
        // Frontend AdminDashboard subscribes to /topic/locations to move pins in real time
        messagingTemplate.convertAndSend("/topic/locations", Map.of(
                "touristId",  dto.getTouristId(),
                "latitude",   dto.getLatitude(),
                "longitude",  dto.getLongitude(),
                "activity",   dto.getActivity() != null ? dto.getActivity() : "WALK",
                "heartRate",  dto.getHeartRate() != null ? dto.getHeartRate() : 0,
                "altitude",   dto.getAltitude()  != null ? dto.getAltitude()  : 0.0,
                "timestamp",  now.toString()
        ));

        // ── FALL alert ────────────────────────────────────────────────────
        if ("FALL".equalsIgnoreCase(dto.getActivity())) {
            Alert a = buildAlert(dto.getTouristId(), "FALL", 100,
                    "Fall detected for tourist " + dto.getTouristId()
                            + " at (" + fmt(dto.getLatitude()) + ", " + fmt(dto.getLongitude()) + ")", now);
            Alert savedAlert = alertRepository.save(a);
            messagingTemplate.convertAndSend("/topic/alerts", savedAlert);
            notificationService.sendEmergencyAlert(dto.getTouristId(), savedAlert);
        }

        // ── SOS alert ─────────────────────────────────────────────────────
        if ("SOS".equalsIgnoreCase(dto.getActivity())) {
            Alert a = buildAlert(dto.getTouristId(), "SOS", 100,
                    "SOS emergency: tourist " + dto.getTouristId()
                            + " triggered panic button at (" + fmt(dto.getLatitude()) + ", " + fmt(dto.getLongitude()) + ")", now);
            Alert savedAlert = alertRepository.save(a);
            messagingTemplate.convertAndSend("/topic/alerts", savedAlert);
            notificationService.sendEmergencyAlert(dto.getTouristId(), savedAlert);
        }

        // ── Anomaly alerts ────────────────────────────────────────────────
        for (Alert a : anomalies) {
            a.setTimestamp(now);
            Alert savedAlert = alertRepository.save(a);
            messagingTemplate.convertAndSend("/topic/alerts", savedAlert);
            if ("CRITICAL".equals(a.getType())) {
                notificationService.sendEmergencyAlert(dto.getTouristId(), savedAlert);
            }
        }

        // ── Zone alerts ───────────────────────────────────────────────────
        LocationResponse resp = new LocationResponse();
        resp.setLocationHistoryId(saved.getId());

        List<LocationResponse.ZoneSummary>  zoneSummaries  = new ArrayList<>();
        List<LocationResponse.AlertSummary> alertSummaries = new ArrayList<>();

        // DB bounding box pre-filter, then precise polygon check in Java
        List<Zone> candidateZones = zoneRepository.findZonesContainingPoint(
                dto.getLatitude(), dto.getLongitude());

        for (Zone zone : candidateZones) {
            if (!pointInZone(dto.getLatitude(), dto.getLongitude(), zone)) continue;

            LocationResponse.ZoneSummary zs = new LocationResponse.ZoneSummary();
            zs.id = zone.getId(); zs.name = zone.getName(); zs.restricted = zone.isRestricted();
            zs.minLat = zone.getMinLat(); zs.maxLat = zone.getMaxLat();
            zs.minLon = zone.getMinLon(); zs.maxLon = zone.getMaxLon();
            zoneSummaries.add(zs);

            if (zone.isRestricted() || zone.getDangerLevel() > 0) {
                if (anomalyDetector.notRecentlySeen(dto.getTouristId(), "ZONE",
                        AnomalyDetector.ZONE_COOLDOWN_MIN, now)) {

                    int severity; String zoneType;
                    switch (zone.getDangerLevel()) {
                        case 4: severity = 100; zoneType = "PROHIBITED"; break;
                        case 3: severity = 100; zoneType = "FORBIDDEN";  break;
                        case 2: severity = 75;  zoneType = "DANGEROUS";  break;
                        case 1: severity = 50;  zoneType = "CAUTION";    break;
                        default: severity = 90; zoneType = "RESTRICTED"; break;
                    }

                    Alert alert = buildAlert(dto.getTouristId(), "ZONE", severity,
                            "Tourist entered " + zoneType + " zone: " + zone.getName(), now);
                    Alert savedAlert = alertRepository.save(alert);
                    messagingTemplate.convertAndSend("/topic/alerts", savedAlert);

                    LocationResponse.AlertSummary as = new LocationResponse.AlertSummary();
                    as.id = savedAlert.getId();
                    as.message = savedAlert.getMessage();
                    as.severity = savedAlert.getSeverity();
                    alertSummaries.add(as);
                }
            }
        }

        resp.setZones(zoneSummaries);
        resp.setAlerts(alertSummaries);
        return resp;
    }

    /**
     * Precise point-in-zone check.
     * Uses ray-casting on polygonCoords if present; falls back to bounding box otherwise.
     * polygonCoords are in GeoJSON order [longitude, latitude].
     */
    private boolean pointInZone(double lat, double lon, Zone zone) {
        double[][] polygon = zone.getPolygonCoords();
        if (polygon == null || polygon.length < 3) {
            return true; // bounding box already matched in DB query
        }
        return pointInPolygon(lat, lon, polygon);
    }

    /**
     * Ray-casting algorithm for point-in-polygon.
     * polygon entries are [lon, lat] (GeoJSON order).
     */
    private boolean pointInPolygon(double lat, double lon, double[][] polygon) {
        int n = polygon.length;
        boolean inside = false;
        int j = n - 1;
        for (int i = 0; i < n; i++) {
            double xi = polygon[i][0]; // lon
            double yi = polygon[i][1]; // lat
            double xj = polygon[j][0];
            double yj = polygon[j][1];
            boolean intersect = ((yi > lat) != (yj > lat))
                    && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
            j = i;
        }
        return inside;
    }

    private Alert buildAlert(String touristId, String type, int severity,
                             String message, LocalDateTime timestamp) {
        Alert a = new Alert();
        a.setTouristId(touristId);
        a.setType(type);
        a.setMessage(message);
        a.setSeverity(severity);
        a.setTimestamp(timestamp);
        return a;
    }

    private String fmt(double val) {
        return String.format("%.6f", val);
    }
}
