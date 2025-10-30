package com.safety.controller;

import com.safety.dto.LocationDTO;
import com.safety.service.LocationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/location")
public class LocationController {

    @Autowired
    private LocationService locationService;

    @PostMapping("/update")
    public String receiveLocation(@RequestBody LocationDTO location) {
        locationService.processLocation(location);
        return "Location received and processed!";
    }
}
