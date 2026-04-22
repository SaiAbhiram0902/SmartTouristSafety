package com.safety.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hotspot_reviews")
public class HotspotReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long hotspotId;

    private String touristId;
    private String authorName;

    @Column(nullable = false)
    private int rating; // 1-5

    @Column(length = 1000)
    private String comment;

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() { this.createdAt = LocalDateTime.now(); }

    public Long getId()                       { return id; }
    public Long getHotspotId()                { return hotspotId; }
    public void setHotspotId(Long h)          { this.hotspotId = h; }
    public String getTouristId()              { return touristId; }
    public void setTouristId(String t)        { this.touristId = t; }
    public String getAuthorName()             { return authorName; }
    public void setAuthorName(String n)       { this.authorName = n; }
    public int getRating()                    { return rating; }
    public void setRating(int r)              { this.rating = r; }
    public String getComment()               { return comment; }
    public void setComment(String c)          { this.comment = c; }
    public LocalDateTime getCreatedAt()       { return createdAt; }
}
