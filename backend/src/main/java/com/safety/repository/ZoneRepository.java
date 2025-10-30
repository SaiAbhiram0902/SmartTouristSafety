package com.safety.repository;

import com.safety.model.Zone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ZoneRepository extends JpaRepository<Zone, Long> {

    @Query("SELECT z FROM Zone z WHERE " +
            "(:lat BETWEEN z.minLat AND z.maxLat) AND " +
            "(:lon BETWEEN z.minLon AND z.maxLon)")
    List<Zone> findZonesContainingPoint(double lat, double lon);
}
