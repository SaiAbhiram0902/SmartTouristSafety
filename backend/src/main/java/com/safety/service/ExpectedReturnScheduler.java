package com.safety.service;

import com.safety.model.Alert;
import com.safety.model.Tourist;
import com.safety.repository.AlertRepository;
import com.safety.repository.TouristRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Component
public class ExpectedReturnScheduler {

    @Autowired private TouristRepository      touristRepository;
    @Autowired private AlertRepository        alertRepository;
    @Autowired private SimpMessagingTemplate  messagingTemplate;
    @Autowired private NotificationService    notificationService;

    // Runs every 5 minutes — checks all active tourists for overdue status
    @Scheduled(fixedDelay = 300_000)
    public void checkOverdueTourists() {
        LocalDateTime now    = LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata"));
        List<Tourist> active = touristRepository.findByActiveTrue();

        for (Tourist tourist : active) {
            if (tourist.getExpectedReturnTime() == null) continue;
            if (now.isBefore(tourist.getExpectedReturnTime())) continue;

            // Only fire one OVERDUE alert per trek — check if already alerted
            // after their expected return time
            boolean alreadyAlerted = alertRepository
                    .existsByTouristIdAndTypeAndTimestampAfter(
                            tourist.getTouristId(), "OVERDUE",
                            tourist.getExpectedReturnTime());

            if (alreadyAlerted) continue;

            long minutesOverdue = Duration.between(
                    tourist.getExpectedReturnTime(), now).toMinutes();

            Alert alert = new Alert();
            alert.setTouristId(tourist.getTouristId());
            alert.setType("OVERDUE");
            alert.setMessage("Tourist " + tourist.getName()
                    + " is " + minutesOverdue + " minutes overdue."
                    + " Expected return: " + tourist.getExpectedReturnTime()
                    + ". Emergency contact: " + tourist.getEmergencyName()
                    + " (" + tourist.getEmergencyContact() + ")");
            alert.setSeverity(85);
            alert.setTimestamp(now);

            Alert saved = alertRepository.save(alert);
            messagingTemplate.convertAndSend("/topic/alerts", saved);
            notificationService.sendEmergencyAlert(tourist.getTouristId(), saved);

            System.out.println("OVERDUE ALERT: " + saved.getMessage());
        }
    }
}
