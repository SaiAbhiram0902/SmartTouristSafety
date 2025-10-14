package services;

import models.Tourist;

public class AlertService {
    public void panicAlert(Tourist t) {
        System.out.println("[ALERT] Panic button pressed by: " + t.getName());
        System.out.println("Location: " + t.getLatitude() + ", " + t.getLongitude());
    }

    public void restrictedZoneAlert(Tourist t) {
        System.out.println("[ALERT] " + t.getName() + " entered a restricted zone!");
    }
}
