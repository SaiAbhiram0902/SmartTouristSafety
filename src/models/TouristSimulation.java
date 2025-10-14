package models;

import services.GeoFenceService;
import services.AlertService;
import services.AnomalyDetector;
import java.util.Random;

public class TouristSimulation implements Runnable {
    private Tourist tourist;
    private GeoFenceService geo;
    private AlertService alerts;
    private AnomalyDetector detector;

    public TouristSimulation(Tourist tourist) {
        this.tourist = tourist;
        this.geo = new GeoFenceService();
        this.alerts = new AlertService();
        this.detector = new AnomalyDetector();
    }

    @Override
    public void run() {
        Random rand = new Random();
        double oldLat, oldLon;
        for (int i = 0; i < 20; i++) {
            oldLat = tourist.getLatitude();
            oldLon = tourist.getLongitude();

            // simulate movement
            tourist.setLatitude(tourist.getLatitude() + (rand.nextDouble() - 0.5) / 100);
            tourist.setLongitude(tourist.getLongitude() + (rand.nextDouble() - 0.5) / 100);

            if (geo.isInsideRestrictedZone(tourist)) {
                alerts.restrictedZoneAlert(tourist);
            }

            detector.checkActivity(tourist, oldLat, oldLon);

            if (rand.nextInt(50) == 10) {
                alerts.panicAlert(tourist);
            }

            try { Thread.sleep(400); } catch (InterruptedException e) { }
        }
    }
}
