package com.safety.repository;

import com.safety.model.HotspotReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface HotspotReviewRepository extends JpaRepository<HotspotReview, Long> {
    List<HotspotReview> findByHotspotIdOrderByCreatedAtDesc(Long hotspotId);
    boolean existsByHotspotIdAndTouristId(Long hotspotId, String touristId);
}
