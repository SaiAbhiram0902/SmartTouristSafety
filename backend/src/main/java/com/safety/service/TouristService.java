package com.safety.service;

import com.safety.model.Tourist;
import com.safety.model.LocationHistory;
import com.safety.model.Alert;
import com.safety.repository.TouristRepository;
import com.safety.repository.LocationHistoryRepository;
import com.safety.repository.AlertRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TouristService {

    @Autowired private TouristRepository touristRepository;
    @Autowired private LocationHistoryRepository locationHistoryRepository;
    @Autowired private AlertRepository alertRepository;

    // ── Create tourist with auto-generated ID ─────────────────────────────
    // ID format: T-001, T-002, ... T-999
    // Admin sees the generated ID immediately after creation and types it
    // into the ESP32 device config once during check-in.
    public Tourist createTourist(Tourist tourist) {
        // Only auto-generate if no ID was explicitly provided
        if (tourist.getTouristId() == null || tourist.getTouristId().isBlank()) {
            tourist.setTouristId(generateNextTouristId());
        } else {
            // Validate format if provided manually
            String id = tourist.getTouristId().trim().toUpperCase();
            if (touristRepository.existsById(id)) {
                throw new IllegalArgumentException("Tourist ID already exists: " + id);
            }
            tourist.setTouristId(id);
        }
        tourist.setRegisteredAt(LocalDateTime.now());
        tourist.setActive(true);
        return touristRepository.save(tourist);
    }

    /**
     * Generates the next sequential Tourist ID in format T-001, T-002, etc.
     * Scans existing IDs to find the highest current number, then increments.
     * Thread-safe via @Transactional on the calling method.
     */
    private String generateNextTouristId() {
        List<Tourist> all = touristRepository.findAll();
        int maxNum = all.stream()
                .map(Tourist::getTouristId)
                .filter(id -> id != null && id.matches("T-\\d{3,}"))
                .mapToInt(id -> {
                    try { return Integer.parseInt(id.substring(2)); }
                    catch (NumberFormatException e) { return 0; }
                })
                .max()
                .orElse(0);

        int next = maxNum + 1;
        if (next > 999) {
            // Beyond T-999 — extend to 4 digits gracefully
            return String.format("T-%04d", next);
        }
        return String.format("T-%03d", next);
    }

    // ── Get all tourists ──────────────────────────────────────────
    public List<Tourist> getAllTourists() {
        return touristRepository.findAll();
    }

    // ── Get active tourists ───────────────────────────────────────
    public List<Tourist> getActiveTourists() {
        return touristRepository.findByActiveTrue();
    }

    // ── Get one tourist ───────────────────────────────────────────
    public Optional<Tourist> getTouristById(String touristId) {
        return touristRepository.findById(touristId);
    }

    // ── Full update — admin can change everything ─────────────────
    public Tourist updateTourist(String touristId, Tourist updated) {
        Tourist existing = touristRepository.findById(touristId)
                .orElseThrow(() -> new RuntimeException("Tourist not found: " + touristId));

        existing.setName(updated.getName());
        existing.setPhone(updated.getPhone());
        existing.setAddress(updated.getAddress());
        existing.setEmergencyContact(updated.getEmergencyContact());
        existing.setEmergencyName(updated.getEmergencyName());
        existing.setEmergencyApiKey(updated.getEmergencyApiKey());
        existing.setParentId(updated.getParentId());
        existing.setActive(updated.isActive());
        existing.setExpectedReturnTime(updated.getExpectedReturnTime());
        existing.setAge(updated.getAge());
        existing.setChild(updated.isChild());
        existing.setElder(updated.isElder());
        existing.setHandicapped(updated.isHandicapped());
        // photoUrl updated separately via the /photo upload endpoint

        return touristRepository.save(existing);
    }

    // ── Self-update — tourist can only edit their own safe fields ─
    // Does NOT allow changing touristId, active status, parentId, or special needs flags.
    public Tourist selfUpdateTourist(String touristId, Tourist updated) {
        Tourist existing = touristRepository.findById(touristId)
                .orElseThrow(() -> new RuntimeException("Tourist not found: " + touristId));

        if (updated.getPhone() != null)            existing.setPhone(updated.getPhone());
        if (updated.getAddress() != null)           existing.setAddress(updated.getAddress());
        if (updated.getEmergencyContact() != null)  existing.setEmergencyContact(updated.getEmergencyContact());
        if (updated.getEmergencyName() != null)     existing.setEmergencyName(updated.getEmergencyName());
        if (updated.getEmergencyApiKey() != null)   existing.setEmergencyApiKey(updated.getEmergencyApiKey());
        if (updated.getExpectedReturnTime() != null) existing.setExpectedReturnTime(updated.getExpectedReturnTime());

        return touristRepository.save(existing);
    }

    // ── Delete tourist ────────────────────────────────────────────
    public void deleteTourist(String touristId) {
        touristRepository.deleteById(touristId);
    }

    // ── Delete all inactive tourists ──────────────────────────────
    @Transactional
    public void deleteAllInactive() {
        List<Tourist> inactive = touristRepository.findAll().stream()
                .filter(t -> !t.isActive())
                .collect(Collectors.toList());
        inactive.forEach(t -> {
            locationHistoryRepository.deleteByTouristId(t.getTouristId());
            alertRepository.deleteByTouristId(t.getTouristId());
        });
        touristRepository.deleteAll(inactive);
    }

    // ── Get family members ────────────────────────────────────────
    public List<Tourist> getFamilyMembers(String parentId) {
        return touristRepository.findByParentId(parentId);
    }

    // ── Get enriched dashboard data for one tourist ───────────────
    public Map<String, Object> getTouristDashboardData(String touristId) {
        Map<String, Object> data = new LinkedHashMap<>();
        Tourist tourist = touristRepository.findById(touristId).orElse(null);
        if (tourist == null) return data;

        data.put("tourist", tourist);

        LocationHistory lastLocation = locationHistoryRepository
                .findTopByTouristIdOrderByTimestampDesc(touristId);
        data.put("lastLocation", lastLocation);

        List<Alert> recentAlerts = alertRepository.findByTouristIdOrderByTimestampDesc(touristId);
        data.put("latestAlert",  recentAlerts.isEmpty() ? null : recentAlerts.get(0));
        data.put("totalAlerts",  recentAlerts.size());

        List<Tourist> family = touristRepository.findByParentId(touristId);
        data.put("familyMembers", family);

        return data;
    }

    // ── Get full dashboard snapshot for ALL active tourists ───────
    public List<Map<String, Object>> getAllTouristsDashboard() {
        return touristRepository.findByActiveTrue().stream()
                .map(t -> getTouristDashboardData(t.getTouristId()))
                .collect(Collectors.toList());
    }

    // ── Checkout tourist ──────────────────────────────────────────
    public Tourist checkoutTourist(String touristId) {
        Tourist tourist = touristRepository.findById(touristId)
                .orElseThrow(() -> new RuntimeException("Tourist not found: " + touristId));
        tourist.setActive(false);
        return touristRepository.save(tourist);
    }
}
