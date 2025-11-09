package com.safety.repository;

import com.safety.model.LocationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LocationHistoryRepository extends JpaRepository<LocationHistory, Long> {
    List<LocationHistory> findByTouristIdOrderByTimestampDesc(String touristId);
    LocationHistory findTopByTouristIdOrderByTimestampDesc(String touristId);

    @Query("SELECT DISTINCT lh.touristId FROM LocationHistory lh")
    List<String> findDistinctTouristIds();
}
