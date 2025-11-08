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
import org.springframework.stereotype.Service;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;


@Service
public class LocationService {

    @Autowired
    private LocationHistoryRepository locationHistoryRepository;

    @Autowired
    private ZoneRepository zoneRepository;

    @Autowired
    private AlertRepository alertRepository;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate; // may be null in tests; guard usage

    @Autowired
    private AnomalyDetector anomalyDetector;

    // LocationService (only the method shown)
    public LocationResponse processLocation(LocationDTO dto) {
        // 1️⃣ Run anomaly detection BEFORE saving
        // The detector itself will fetch the real previous record from DB
        List<Alert> anomalies = anomalyDetector.detect(dto,
                locationHistoryRepository.findTopByTouristIdOrderByTimestampDesc(dto.getTouristId()));

        // 2️⃣ Save the current location history
        LocationHistory history = new LocationHistory();
        history.setTouristId(dto.getTouristId());
        history.setLatitude(dto.getLatitude());
        history.setLongitude(dto.getLongitude());
        history.setActivity(dto.getActivity());
        history.setHeartRate(dto.getHeartRate());
        history.setTimestamp(LocalDateTime.now());
        LocationHistory saved = locationHistoryRepository.save(history);

        // 3️⃣ Persist anomalies (if any)
        for (Alert a : anomalies) {
            alertRepository.save(a);
            if (messagingTemplate != null)
                messagingTemplate.convertAndSend("/topic/alerts", a);
            System.out.println("⚠️ ALERT (anomaly): " + a.getMessage());
        }

        // 4️⃣ Continue with zone + health alerts (unchanged)
        LocationResponse resp = new LocationResponse();
        resp.setLocationHistoryId(saved.getId());

        List<LocationResponse.ZoneSummary> zoneSummaries = new ArrayList<>();
        List<LocationResponse.AlertSummary> alertSummaries = new ArrayList<>();

        List<Zone> zones = zoneRepository.findZonesContainingPoint(dto.getLatitude(), dto.getLongitude());
        for (Zone zone : zones) {
            LocationResponse.ZoneSummary zs = new LocationResponse.ZoneSummary();
            zs.id = zone.getId();
            zs.name = zone.getName();
            zs.restricted = zone.isRestricted();
            zs.minLat = zone.getMinLat();
            zs.maxLat = zone.getMaxLat();
            zs.minLon = zone.getMinLon();
            zs.maxLon = zone.getMaxLon();
            zoneSummaries.add(zs);

            if (zone.isRestricted()) {
                Alert alert = new Alert();
                alert.setTouristId(dto.getTouristId());
                alert.setMessage("Tourist entered restricted zone: " + zone.getName());
                alert.setSeverity(90);
                alert.setTimestamp(LocalDateTime.now());
                Alert savedAlert = alertRepository.save(alert);
                try {
                    if (messagingTemplate != null) messagingTemplate.convertAndSend("/topic/alerts", savedAlert);
                } catch (Exception ignored) {}
                LocationResponse.AlertSummary as = new LocationResponse.AlertSummary();
                as.id = savedAlert.getId();
                as.message = savedAlert.getMessage();
                as.severity = savedAlert.getSeverity();
                alertSummaries.add(as);
                System.out.println("⚠️ ALERT: " + savedAlert.getMessage());
            }
        }

        // Heart rate alert (unchanged)
        if (dto.getHeartRate() != null && dto.getHeartRate() > 160) {
            Alert alert = new Alert();
            alert.setTouristId(dto.getTouristId());
            alert.setMessage("Abnormal heart rate detected (" + dto.getHeartRate() + " bpm)");
            alert.setSeverity(85);
            alert.setTimestamp(LocalDateTime.now());
            Alert savedAlert = alertRepository.save(alert);
            try {
                if (messagingTemplate != null) messagingTemplate.convertAndSend("/topic/alerts", savedAlert);
            } catch (Exception ignored) {}
            LocationResponse.AlertSummary as = new LocationResponse.AlertSummary();
            as.id = savedAlert.getId();
            as.message = savedAlert.getMessage();
            as.severity = savedAlert.getSeverity();
            alertSummaries.add(as);
            System.out.println("⚠️ ALERT: " + savedAlert.getMessage());
        }

        resp.setZones(zoneSummaries);
        resp.setAlerts(alertSummaries);
        return resp;
    }
}
