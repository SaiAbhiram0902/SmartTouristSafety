package com.safety.controller;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class GeoController {

    @GetMapping("/test")
    public String testEndpoint() {
        return "Smart Tourist Safety API is running!";
    }
}
