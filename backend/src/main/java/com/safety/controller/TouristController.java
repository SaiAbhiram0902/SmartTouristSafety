package com.safety.controller;

import com.safety.model.Tourist;
import com.safety.service.TouristService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;

@RestController
@RequestMapping("/api/tourists")
public class TouristController {

    @Autowired private TouristService touristService;

    // Directory where photos are stored — configurable via application.properties
    @Value("${upload.dir:uploads/photos}")
    private String uploadDir;

    // ── GET all tourists ──────────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<Tourist>> getAllTourists() {
        return ResponseEntity.ok(touristService.getAllTourists());
    }

    // ── GET active tourists only ──────────────────────────────────
    @GetMapping("/active")
    public ResponseEntity<List<Tourist>> getActiveTourists() {
        return ResponseEntity.ok(touristService.getActiveTourists());
    }

    // ── GET full dashboard snapshot for all active tourists ───────
    // Used by the map view — returns tourist + last location + latest alert
    @GetMapping("/dashboard")
    public ResponseEntity<List<Map<String, Object>>> getDashboard() {
        return ResponseEntity.ok(touristService.getAllTouristsDashboard());
    }

    // ── GET one tourist by ID ─────────────────────────────────────
    @GetMapping("/{touristId}")
    public ResponseEntity<?> getTourist(@PathVariable String touristId) {
        return touristService.getTouristById(touristId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ── GET enriched dashboard data for one tourist ───────────────
    @GetMapping("/{touristId}/dashboard")
    public ResponseEntity<Map<String, Object>> getTouristDashboard(@PathVariable String touristId) {
        Map<String, Object> data = touristService.getTouristDashboardData(touristId);
        if (data.isEmpty()) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(data);
    }

    // ── GET family members of a tourist ──────────────────────────
    @GetMapping("/{touristId}/family")
    public ResponseEntity<List<Tourist>> getFamily(@PathVariable String touristId) {
        return ResponseEntity.ok(touristService.getFamilyMembers(touristId));
    }

    // ── POST create new tourist ───────────────────────────────────
    @PostMapping
    public ResponseEntity<Tourist> createTourist(@RequestBody Tourist tourist) {
        Tourist saved = touristService.createTourist(tourist);
        return ResponseEntity.ok(saved);
    }

    // ── PUT update tourist profile (admin only) ──────────────────
    // Updates all fields including emergency contact, special needs flags,
    // expected return time, and age — previously these were silently ignored.
    @PutMapping("/{touristId}")
    public ResponseEntity<Tourist> updateTourist(
            @PathVariable String touristId,
            @RequestBody Tourist tourist) {
        return ResponseEntity.ok(touristService.updateTourist(touristId, tourist));
    }

    // ── PATCH checkout tourist (mark inactive) ────────────────────
    @PatchMapping("/{touristId}/checkout")
    public ResponseEntity<Tourist> checkout(@PathVariable String touristId) {
        return ResponseEntity.ok(touristService.checkoutTourist(touristId));
    }

    // ── DELETE tourist ────────────────────────────────────────────
    @DeleteMapping("/{touristId}")
    public ResponseEntity<Void> deleteTourist(@PathVariable String touristId) {
        touristService.deleteTourist(touristId);
        return ResponseEntity.noContent().build();
    }

    // ── DELETE all inactive tourists ──────────────────────────────
    @DeleteMapping("/inactive")
    public ResponseEntity<Void> deleteAllInactive() {
        touristService.deleteAllInactive();
        return ResponseEntity.noContent().build();
    }

    // ── POST upload profile photo ─────────────────────────────────
    // Accepts multipart/form-data with a file field named "photo"
    // Saves to uploadDir and updates tourist's photoUrl
    @PostMapping("/{touristId}/photo")
    public ResponseEntity<?> uploadPhoto(
            @PathVariable String touristId,
            @RequestParam("photo") MultipartFile file) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("No file provided");
        }

        try {
            // Create upload directory if it doesn't exist
            Path uploadPath = Paths.get(uploadDir);
            Files.createDirectories(uploadPath);

            // Save file as touristId + original extension e.g. T-001.jpg
            String originalName = file.getOriginalFilename();
            String ext = originalName != null && originalName.contains(".")
                    ? originalName.substring(originalName.lastIndexOf("."))
                    : ".jpg";
            String filename = touristId + ext;
            Path filePath = uploadPath.resolve(filename);
            Files.write(filePath, file.getBytes());

            // Update tourist's photoUrl in DB
            String photoUrl = "/uploads/photos/" + filename;
            touristService.getTouristById(touristId).ifPresent(t -> {
                t.setPhotoUrl(photoUrl);
                touristService.updateTourist(touristId, t);
            });

            return ResponseEntity.ok(Map.of("photoUrl", photoUrl));

        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body("Failed to save photo: " + e.getMessage());
        }
    }
}
