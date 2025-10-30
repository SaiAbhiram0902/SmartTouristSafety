package com.safety.service;

import com.safety.model.Alert;
import com.safety.model.LocationHistory;
import com.safety.model.Zone;
import com.safety.repository.AlertRepository;
import com.safety.repository.LocationHistoryRepository;
import com.safety.repository.ZoneRepository;
import com.safety.dto.LocationDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class LocationService {

    @Autowired
    private LocationHistoryRepository locationHistoryRepository;

    @Autowired
    private ZoneRepository zoneRepository;

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void processLocation(LocationDTO dto) {
        // 1️⃣ Save location history
        LocationHistory history = new LocationHistory();
        history.setTouristId(dto.getTouristId());
        history.setLatitude(dto.getLatitude());
        history.setLongitude(dto.getLongitude());
        history.setActivity(dto.getActivity());
        history.setHeartRate(dto.getHeartRate());
        history.setTimestamp(LocalDateTime.now());
        locationHistoryRepository.save(history);

        // 2️⃣ Zone detection
        List<Zone> zones = zoneRepository.findZonesContainingPoint(dto.getLatitude(), dto.getLongitude());
        for (Zone zone : zones) {
            if (zone.isRestricted()) {
                createAndSendAlert(dto.getTouristId(), "Entered restricted zone: " + zone.getName(), 80);
            }
        }

        // 3️⃣ Simple anomaly detection (stub for real IoT logic)
        if (dto.getHeartRate() != null && dto.getHeartRate() > 160) {
            createAndSendAlert(dto.getTouristId(), "Abnormal heart rate detected (" + dto.getHeartRate() + " bpm)", 90);
        }

        // (Later: check speed/inactivity anomalies using recent LocationHistory)
    }

    private void createAndSendAlert(String touristId, String message, int severity) {
        Alert alert = new Alert();
        alert.setTouristId(touristId);
        alert.setMessage(message);
        alert.setSeverity(severity);
        alert.setTimestamp(LocalDateTime.now());
        alertRepository.save(alert);

        // 5️⃣ Push alert to dashboard (WebSocket topic)
        messagingTemplate.convertAndSend("/topic/alerts", alert);
    }
}
