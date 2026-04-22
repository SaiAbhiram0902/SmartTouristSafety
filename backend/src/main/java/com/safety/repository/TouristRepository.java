package com.safety.repository;

import com.safety.model.Tourist;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TouristRepository extends JpaRepository<Tourist, String> {

    // Get all children linked to a parent tourist
    List<Tourist> findByParentId(String parentId);

    // Get all currently active tourists
    List<Tourist> findByActiveTrue();

    // Get all tourists with no parent — i.e. group leaders / solo tourists
    List<Tourist> findByParentIdIsNull();
}
