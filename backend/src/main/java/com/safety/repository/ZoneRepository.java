package com.safety.repository;

import com.safety.model.Zone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ZoneRepository extends JpaRepository<Zone, Long> {

    @Query("SELECT z FROM Zone z WHERE :lat BETWEEN z.minLat AND z.maxLat AND :lon BETWEEN z.minLon AND z.maxLon")
    List<Zone> findZonesContainingPoint(@Param("lat") double latitude, @Param("lon") double longitude);
}
