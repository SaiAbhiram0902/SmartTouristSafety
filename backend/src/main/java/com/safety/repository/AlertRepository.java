package com.safety.repository;

import com.safety.model.Alert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findByTouristIdOrderByTimestampDesc(String touristId);

    // Deduplication check — returns true if the same alert type was already
    // raised for this tourist within the given time window.
    // Used by AnomalyDetector and ExpectedReturnScheduler to avoid alert spam.
    boolean existsByTouristIdAndTypeAndTimestampAfter(
            String touristId, String type, LocalDateTime timestamp);

    // Cleanup when a tourist is deleted
    void deleteByTouristId(String touristId);
}
