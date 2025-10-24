package com.safety.service;

import org.springframework.stereotype.Service;

@Service
public class AlertService {

    public void logAlert(String alert) {
        System.out.println("🚨 ALERT RECEIVED: " + alert);
        // Todo: write to DB, Web UI, notifications.
    }
}
