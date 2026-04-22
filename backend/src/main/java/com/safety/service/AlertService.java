package com.safety.service;

import com.safety.model.Alert;
import com.safety.repository.AlertRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AlertService {

    @Autowired
    private AlertRepository alertRepository;

    public List<Alert> getAllAlerts() {
        return alertRepository.findAll();
    }

    public List<Alert> getAlertsForTourist(String touristId) {
        return alertRepository.findByTouristIdOrderByTimestampDesc(touristId);
    }

    public Alert save(Alert alert) {
        return alertRepository.save(alert);
    }

    // Mark alert resolved — persists to DB
    // Throws if alert not found so controller can return 404
    public Alert resolveAlert(Long id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Alert not found: " + id));
        alert.setResolved(true);
        alert.setResolvedAt(LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata")));
        return alertRepository.save(alert);
    }
}
