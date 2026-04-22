package com.safety.service;

import com.safety.model.Alert;
import com.safety.model.LocationHistory;
import com.safety.model.Tourist;
import com.safety.repository.AlertRepository;
import com.safety.repository.LocationHistoryRepository;
import com.safety.repository.TouristRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

/**
 * Checks every 5 minutes whether any active tourist's IoT device
 * has gone silent (no GPS ping received for >= SILENCE_THRESHOLD_MINUTES).
 *
 * Fires exactly one NO_SIGNAL alert per silence period.
 * When the device comes back online (new location saved), the "since" anchor
 * resets and the next silence would fire a fresh alert.
 *
 * Does NOT fire for tourists who have never sent any location at all
 * (e.g. just registered, device not yet activated) — only fires when
 * a previously active device goes silent.
 */
@Component
public class HeartbeatScheduler {

    private static final long SILENCE_THRESHOLD_MINUTES = 5;
    private static final int  ALERT_SEVERITY            = 70;

    @Autowired private TouristRepository          touristRepository;
    @Autowired private LocationHistoryRepository  locationHistoryRepository;
    @Autowired private AlertRepository            alertRepository;
    @Autowired private SimpMessagingTemplate      messagingTemplate;
    @Autowired private NotificationService        notificationService;

    @Scheduled(fixedDelay = 300_000) // every 5 minutes
    public void checkHeartbeats() {
        LocalDateTime now       = LocalDateTime.now(ZoneId.of("Asia/Kolkata"));
        LocalDateTime threshold = now.minusMinutes(SILENCE_THRESHOLD_MINUTES);

        List<Tourist> active = touristRepository.findByActiveTrue();

        for (Tourist tourist : active) {
            LocationHistory last = locationHistoryRepository
                    .findTopByTouristIdOrderByTimestampDesc(tourist.getTouristId());

            // Only flag devices that were seen before but have now gone quiet
            if (last == null) continue;
            if (last.getTimestamp().isAfter(threshold)) continue;

            // Check if we already fired an alert after the last ping
            boolean alreadyAlerted = alertRepository
                    .existsByTouristIdAndTypeAndTimestampAfter(
                            tourist.getTouristId(), "NO_SIGNAL", last.getTimestamp());

            if (alreadyAlerted) continue;

            long minutesSilent = Duration.between(last.getTimestamp(), now).toMinutes();

            Alert alert = new Alert();
            alert.setTouristId(tourist.getTouristId());
            alert.setType("NO_SIGNAL");
            alert.setMessage("No GPS signal from " + tourist.getName()
                    + " for " + minutesSilent + " minute" + (minutesSilent == 1 ? "" : "s")
                    + " — IoT device may be offline or out of range."
                    + " Last known: (" + String.format("%.6f", last.getLatitude())
                    + ", " + String.format("%.6f", last.getLongitude()) + ")");
            alert.setSeverity(ALERT_SEVERITY);
            alert.setTimestamp(now);

            Alert saved = alertRepository.save(alert);
            messagingTemplate.convertAndSend("/topic/alerts", saved);
            notificationService.sendEmergencyAlert(tourist.getTouristId(), saved);

            System.out.printf("NO_SIGNAL: %s silent for %d min (last ping: %s)%n",
                    tourist.getTouristId(), minutesSilent, last.getTimestamp());
        }
    }
}
