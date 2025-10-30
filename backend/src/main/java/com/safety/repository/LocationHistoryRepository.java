package com.safety.repository;

import com.safety.model.LocationHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LocationHistoryRepository extends JpaRepository<LocationHistory, Long> {
    List<LocationHistory> findByTouristIdOrderByTimestampDesc(String touristId);
}
