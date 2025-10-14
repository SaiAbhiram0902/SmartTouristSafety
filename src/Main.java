import models.Tourist;
import services.GeoFenceService;
import services.AlertService;
import services.AnomalyDetector;
import java.util.Random;

public class Main {
    public static void main(String[] args) {
        Tourist t1 = new Tourist("T001", "Alice", 26.910, 75.785);
        GeoFenceService geo = new GeoFenceService();
        AlertService alerts = new AlertService();
        AnomalyDetector detector = new AnomalyDetector();
        Random rand = new Random();

        double oldLat, oldLon;
        for (int i = 0; i < 20; i++) {
            oldLat = t1.getLatitude();
            oldLon = t1.getLongitude();

            // Simulate small movement
            t1.setLatitude(t1.getLatitude() + (rand.nextDouble() - 0.5) / 100);
            t1.setLongitude(t1.getLongitude() + (rand.nextDouble() - 0.5) / 100);

            if (geo.isInsideRestrictedZone(t1)) {
                alerts.restrictedZoneAlert(t1);
            }

            detector.checkActivity(t1, oldLat, oldLon);

            // Randomly simulate panic
            if (rand.nextInt(50) == 10) {
                alerts.panicAlert(t1);
            }

            try { Thread.sleep(500); } catch (InterruptedException e) { }
        }
    }
}
