package com.safety.model;

import jakarta.persistence.*;

@Entity
public class Zone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private double minLat;
    private double maxLat;
    private double minLon;
    private double maxLon;
    private boolean restricted;

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public double getMinLat() { return minLat; }
    public void setMinLat(double minLat) { this.minLat = minLat; }

    public double getMaxLat() { return maxLat; }
    public void setMaxLat(double maxLat) { this.maxLat = maxLat; }

    public double getMinLon() { return minLon; }
    public void setMinLon(double minLon) { this.minLon = minLon; }

    public double getMaxLon() { return maxLon; }
    public void setMaxLon(double maxLon) { this.maxLon = maxLon; }

    public boolean isRestricted() { return restricted; }
    public void setRestricted(boolean restricted) { this.restricted = restricted; }
}
