package services;

import models.Tourist;
import java.util.HashMap;

public class AnomalyDetector {
    private HashMap<String, Integer> inactivityCount = new HashMap<>();

    public void checkActivity(Tourist t, double oldLat, double oldLon) {
        if (oldLat == t.getLatitude() && oldLon == t.getLongitude()) {
            int count = inactivityCount.getOrDefault(t.getId(), 0) + 1;
            inactivityCount.put(t.getId(), count);
            if (count > 3) {
                System.out.println("[WARNING] " + t.getName() + " inactive for long!");
            }
        } else {
            inactivityCount.put(t.getId(), 0);
        }
    }
}
