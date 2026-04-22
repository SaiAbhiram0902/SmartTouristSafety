package com.safety;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling  // Required for ExpectedReturnScheduler to run
public class SmartTouristSafetyApplication {

    public static void main(String[] args) {
        SpringApplication.run(SmartTouristSafetyApplication.class, args);
    }
}
