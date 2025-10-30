package com.safety.dto;

public class LocationDTO {
    private String touristId;
    private double latitude;
    private double longitude;
    private String activity; // optional: trekking/boating
    private Integer heartRate; // optional

    // Constructors
    public LocationDTO() {}

    public LocationDTO(String touristId, double latitude, double longitude, String activity, Integer heartRate) {
        this.touristId = touristId;
        this.latitude = latitude;
        this.longitude = longitude;
        this.activity = activity;
        this.heartRate = heartRate;
    }

    // Getters and Setters
    public String getTouristId() {
        return touristId;
    }

    public void setTouristId(String touristId) {
        this.touristId = touristId;
    }

    public double getLatitude() {
        return latitude;
    }

    public void setLatitude(double latitude) {
        this.latitude = latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public void setLongitude(double longitude) {
        this.longitude = longitude;
    }

    public String getActivity() {
        return activity;
    }

    public void setActivity(String activity) {
        this.activity = activity;
    }

    public Integer getHeartRate() {
        return heartRate;
    }

    public void setHeartRate(Integer heartRate) {
        this.heartRate = heartRate;
    }
}
