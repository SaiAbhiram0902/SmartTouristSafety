package com.safety.controller;

import com.safety.dto.LocationDTO;
import com.safety.dto.LocationResponse;
import com.safety.model.LocationHistory;
import com.safety.repository.LocationHistoryRepository;
import com.safety.service.LocationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/location")
public class LocationController {

    @Autowired private LocationService locationService;
    @Autowired private LocationHistoryRepository locationHistoryRepository;

    // ── ESP32 posts here every 5 seconds ──────────────────────────
    @PostMapping("/update")
    public LocationResponse receiveLocation(@RequestBody LocationDTO location) {
        return locationService.processLocation(location);
    }

    // ── Full location history for a tourist ───────────────────────
    // Used by AdminTouristDetail to render the breadcrumb trail on the map.
    // Returns most recent first; limited to last 500 points to keep response fast.
    @GetMapping("/history/{touristId}")
    public ResponseEntity<List<LocationHistory>> getHistory(@PathVariable String touristId) {
        List<LocationHistory> history = locationHistoryRepository
                .findByTouristIdOrderByTimestampDesc(touristId);
        // Cap at 500 points — enough for a full day's trek at 5s intervals
        if (history.size() > 500) {
            history = history.subList(0, 500);
        }
        return ResponseEntity.ok(history);
    }
}
