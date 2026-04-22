package com.safety.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "tourist")
public class Tourist {

    @Id
    @Column(name = "tourist_id")
    private String touristId;

    private String name;
    private String phone;
    private String address;
    private String photoUrl;

    // Emergency contact phone number — international format, no +
    // e.g. "919876543210" for India
    private String emergencyContact;
    private String emergencyName;

    // CallMeBot API key for this emergency contact number.
    // Each number has its own key — obtained by sending
    // "I allow callmebot to send me messages" to +34 623 78 64 49 on WhatsApp.
    // If null/blank, falls back to callmebot.api.key in application-local.properties.
    private String emergencyApiKey;

    @Column(name = "parent_id")
    private String parentId;

    private LocalDateTime registeredAt;
    private boolean active;

    private LocalDateTime expectedReturnTime;

    private Integer age;

    @Column(name = "is_child", nullable = false, columnDefinition = "boolean default false")
    private boolean isChild;

    @Column(name = "is_elder", nullable = false, columnDefinition = "boolean default false")
    private boolean isElder;

    @Column(name = "is_handicapped", nullable = false, columnDefinition = "boolean default false")
    private boolean isHandicapped;

    public Tourist() {}

    public String getTouristId() { return touristId; }
    public void setTouristId(String touristId) { this.touristId = touristId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public String getEmergencyContact() { return emergencyContact; }
    public void setEmergencyContact(String emergencyContact) { this.emergencyContact = emergencyContact; }

    public String getEmergencyName() { return emergencyName; }
    public void setEmergencyName(String emergencyName) { this.emergencyName = emergencyName; }

    public String getEmergencyApiKey() { return emergencyApiKey; }
    public void setEmergencyApiKey(String emergencyApiKey) { this.emergencyApiKey = emergencyApiKey; }

    public String getParentId() { return parentId; }
    public void setParentId(String parentId) { this.parentId = parentId; }

    public LocalDateTime getRegisteredAt() { return registeredAt; }
    public void setRegisteredAt(LocalDateTime registeredAt) { this.registeredAt = registeredAt; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public LocalDateTime getExpectedReturnTime() { return expectedReturnTime; }
    public void setExpectedReturnTime(LocalDateTime expectedReturnTime) { this.expectedReturnTime = expectedReturnTime; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public boolean isChild() { return isChild; }
    public void setChild(boolean child) { isChild = child; }

    public boolean isElder() { return isElder; }
    public void setElder(boolean elder) { isElder = elder; }

    public boolean isHandicapped() { return isHandicapped; }
    public void setHandicapped(boolean handicapped) { isHandicapped = handicapped; }
}
