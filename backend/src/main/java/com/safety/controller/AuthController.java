package com.safety.controller;

import com.safety.dto.AuthRequest;
import com.safety.dto.AuthResponse;
import com.safety.dto.RegisterRequest;
import com.safety.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    // POST /api/auth/login
    // Body: { "username": "admin", "password": "admin123" }
    // Returns: { "token": "...", "role": "ADMIN", "username": "admin", "touristId": null }
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }

    // POST /api/auth/register
    // Body: { "username": "rahul", "password": "pass123", "role": "USER", "touristId": "T-001" }
    // Returns same as login — token + role + touristId
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            AuthResponse response = authService.register(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }
}
