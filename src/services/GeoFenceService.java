package services;

import models.Tourist;

public class GeoFenceService {
    private double restrictedLat = 26.9124;   // Example coords
    private double restrictedLon = 75.7873;
    private double radius = 0.02;  // about ~2km

    public boolean isInsideRestrictedZone(Tourist t) {
        double dist = Math.sqrt(Math.pow(t.getLatitude() - restrictedLat, 2) +
                Math.pow(t.getLongitude() - restrictedLon, 2));
        return dist < radius;
    }
}
