package services;

import models.Tourist;

import java.io.FileWriter;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.OutputStream;
import java.time.LocalDateTime;

public class AlertService {

    private void writeToLog(String message) {
        try (FileWriter fw = new FileWriter("alerts_log.txt", true)) {
            fw.write(LocalDateTime.now() + " " + message + "\n");
        } catch (IOException e) {
            System.out.println("Error writing to log file: " + e.getMessage());
        }
    }

    private void sendToBackend(String msg) {
        try {
            URL url = new URL("http://localhost:8080/api/alerts");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");

            String json = "{\"alert\":\"" + msg + "\"}";
            try (OutputStream os = conn.getOutputStream()) {
                os.write(json.getBytes());
            }

            System.out.println("Backend response: " + conn.getResponseCode());

        } catch (Exception e) {
            System.out.println("Backend unreachable: " + e.getMessage());
        }
    }

    public void panicAlert(Tourist t) {
        String msg = "[PANIC] " + t.getName() + " at " + t.getLatitude() + ", " + t.getLongitude();
        System.out.println(msg);
        writeToLog(msg);
        sendToBackend(msg);
    }

    public void restrictedZoneAlert(Tourist t) {
        String msg = "[RESTRICTED] " + t.getName() + " entered restricted zone!";
        System.out.println(msg);
        writeToLog(msg);
        sendToBackend(msg);
    }
}
