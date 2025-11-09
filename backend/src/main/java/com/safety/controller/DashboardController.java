package com.safety.controller;

import com.safety.model.LocationHistory;
import com.safety.repository.LocationHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*") // frontend connect
public class DashboardController {

    @Autowired
    private LocationHistoryRepository locationHistoryRepository;

    /**
     * TASK 3 (GET): For the frontend's live map.
     * Returns the last known location of every single tourist.
     */
    @GetMapping("/locations")
    public ResponseEntity<List<LocationHistory>> getLatestLocations() {

        // 1. Get all unique tourist IDs
        List<String> touristIds = locationHistoryRepository.findDistinctTouristIds();

        List<LocationHistory> latestLocations = new ArrayList<>();

        // 2. For each ID, find their most recent location
        for (String id : touristIds) {
            LocationHistory lastLocation = locationHistoryRepository.findTopByTouristIdOrderByTimestampDesc(id);
            if (lastLocation != null) {
                latestLocations.add(lastLocation);
            }
        }

        // 3. Return the list
        return ResponseEntity.ok(latestLocations);
    }
}
