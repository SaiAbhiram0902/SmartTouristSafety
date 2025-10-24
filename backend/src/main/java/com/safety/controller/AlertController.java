package com.safety.controller;

import com.safety.service.AlertService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    @Autowired
    private AlertService alertService;

    @PostMapping
    public ResponseEntity<String> receiveAlert(@RequestBody String alert) {
        alertService.logAlert(alert);
        return ResponseEntity.ok("Alert received!");
    }
}
