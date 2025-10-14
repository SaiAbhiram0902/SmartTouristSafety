package services;

import models.Tourist;

import java.io.FileWriter;
import java.io.IOException;
import java.time.LocalDateTime;

public class AlertService {
    private void writeToLog(String message) {
        try (FileWriter fw = new FileWriter("alerts_log.txt", true)) {
            fw.write(LocalDateTime.now() + " " + message + "\n");
        } catch (IOException e) {
            System.out.println("Error writing to log file: " + e.getMessage());
        }
    }

    public void panicAlert(Tourist t) {
        String msg = "[PANIC] " + t.getName() + " at " + t.getLatitude() + ", " + t.getLongitude();
        System.out.println(msg);
        writeToLog(msg);
    }

    public void restrictedZoneAlert(Tourist t) {
        String msg = "[RESTRICTED] " + t.getName() + " entered restricted zone!";
        System.out.println(msg);
        writeToLog(msg);
    }
}
