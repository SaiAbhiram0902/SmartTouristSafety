package com.safety.controller;

import com.safety.model.Zone;
import com.safety.repository.ZoneRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/zones")
public class ZoneController {

    @Autowired
    private ZoneRepository zoneRepository;

    @GetMapping
    public ResponseEntity<List<Zone>> getAllZones() {
        return ResponseEntity.ok(zoneRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Zone> getZone(@PathVariable Long id) {
        return zoneRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Zone> createZone(@RequestBody Zone zone) {
        zone.setActive(true);
        return ResponseEntity.ok(zoneRepository.save(zone));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Zone> updateZone(@PathVariable Long id, @RequestBody Zone zone) {
        zone.setId(id);
        return ResponseEntity.ok(zoneRepository.save(zone));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<Zone> toggleActive(@PathVariable Long id) {
        return zoneRepository.findById(id).map(z -> {
            z.setActive(!z.isActive());
            return ResponseEntity.ok(zoneRepository.save(z));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteZone(@PathVariable Long id) {
        zoneRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
