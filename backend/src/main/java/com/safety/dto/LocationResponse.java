package com.safety.dto;

import java.util.List;

public class LocationResponse {

    private Long locationHistoryId;
    private List<ZoneSummary> zones;
    private List<AlertSummary> alerts;

    public static class ZoneSummary {
        public Long id;
        public String name;
        public boolean restricted;
        public double minLat;
        public double maxLat;
        public double minLon;
        public double maxLon;
    }

    public static class AlertSummary {
        public Long id;
        public String message;
        public int severity;
    }

    // Getters / setters
    public Long getLocationHistoryId() { return locationHistoryId; }
    public void setLocationHistoryId(Long locationHistoryId) { this.locationHistoryId = locationHistoryId; }

    public List<ZoneSummary> getZones() { return zones; }
    public void setZones(List<ZoneSummary> zones) { this.zones = zones; }

    public List<AlertSummary> getAlerts() { return alerts; }
    public void setAlerts(List<AlertSummary> alerts) { this.alerts = alerts; }
}
