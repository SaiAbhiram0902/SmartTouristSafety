package com.safety.controller;

import com.safety.model.Zone;
import com.safety.repository.ZoneRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/zones")
@CrossOrigin(origins = "*") // connect
public class ZoneController {

    @Autowired
    private ZoneRepository zoneRepository;

    /**
     * TASK 1 (POST): For the frontend to CREATE a new zone.
     * Build a form that sends a Zone object here.
     */
    @PostMapping
    public ResponseEntity<Zone> createZone(@RequestBody Zone zone) {
        Zone savedZone = zoneRepository.save(zone);
        return ResponseEntity.ok(savedZone);
    }

    /**
     * TASK 2 (GET): For the frontend to GET all zones to draw on the map.
     */
    @GetMapping
    public ResponseEntity<List<Zone>> getAllZones() {
        List<Zone> zones = zoneRepository.findAll();
        return ResponseEntity.ok(zones);
    }
}
