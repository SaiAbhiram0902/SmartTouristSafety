package com.safety.model;

import com.safety.config.PolygonCoordsConverter;
import jakarta.persistence.*;

@Entity
public class Zone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;

    private double minLat;
    private double maxLat;
    private double minLon;
    private double maxLon;

    private boolean restricted;
    private boolean active = true;

    // dangerLevel: 0 = safe (green), 1 = caution (yellow),
    //              2 = medium risk (orange), 3 = high risk (red), 4 = prohibited (dark red)
    private int dangerLevel;

    // Optional: max altitude allowed in this zone (metres). 0 = no limit.
    private double maxAltitude;

    // Optional: actual polygon drawn by admin. Stored as a JSON array of [lng, lat] pairs.
    // If present, used for display instead of the bounding box rectangle.
    // Note: zone breach detection in LocationService still uses minLat/maxLat/minLon/maxLon
    // (bounding box) since that's a fast JPQL query. The bounding box is always computed
    // from the polygon points by the frontend and stored alongside the polygon.
    @Column(columnDefinition = "TEXT")
    @Convert(converter = PolygonCoordsConverter.class)
    private double[][] polygonCoords;

    public Zone() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

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

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public int getDangerLevel() { return dangerLevel; }
    public void setDangerLevel(int dangerLevel) { this.dangerLevel = dangerLevel; }

    public double getMaxAltitude() { return maxAltitude; }
    public void setMaxAltitude(double maxAltitude) { this.maxAltitude = maxAltitude; }

    public double[][] getPolygonCoords() { return polygonCoords; }
    public void setPolygonCoords(double[][] polygonCoords) { this.polygonCoords = polygonCoords; }
}
