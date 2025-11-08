package com.safety.controller;

import com.safety.dto.LocationDTO;
import com.safety.dto.LocationResponse;
import com.safety.service.LocationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/location")
public class LocationController {

    @Autowired
    private LocationService locationService;

    @PostMapping("/update")
    public LocationResponse receiveLocation(@RequestBody LocationDTO location) {
        // returns zones found + any alerts generated
        return locationService.processLocation(location);
    }
}
