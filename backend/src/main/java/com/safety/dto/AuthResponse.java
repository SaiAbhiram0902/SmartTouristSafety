package com.safety.dto;

public class AuthResponse {

    private String token;
    private String role;
    private String username;
    private String touristId; // null for ADMIN, set for USER

    public AuthResponse(String token, String role, String username, String touristId) {
        this.token     = token;
        this.role      = role;
        this.username  = username;
        this.touristId = touristId;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getTouristId() {
        return touristId;
    }

    public void setTouristId(String touristId) {
        this.touristId = touristId;
    }
}
