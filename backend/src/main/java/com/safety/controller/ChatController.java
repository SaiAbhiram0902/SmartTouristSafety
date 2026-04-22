package com.safety.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Proxies chat to Groq — completely FREE, no credit card required.
 *
 * Setup: add to application-local.properties:
 *   groq.api.key=gsk_...
 *
 * Get a FREE key (takes 30 seconds):
 *   1. Go to https://console.groq.com
 *   2. Sign up / log in
 *   3. Click "API Keys" → "Create API Key"
 *   4. Copy the gsk_... key
 *
 * Free tier: 14,400 requests/day, 30 req/min — effectively unlimited for a demo.
 * Model: llama-3.3-70b-versatile — better than GPT-3.5, completely free.
 */
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Value("${groq.api.key:${GROQ_API_KEY:}}")
    private String groqKey;

    private final RestTemplate http = new RestTemplate();

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL    = "llama-3.3-70b-versatile";

    @PostMapping
    public ResponseEntity<?> chat(@RequestBody Map<String, Object> body) {
        if (groqKey == null || groqKey.isBlank()) {
            return ResponseEntity.status(503)
                    .body(Map.of("error",
                            "groq.api.key not set. Get a free key at https://console.groq.com → API Keys"));
        }

        try {
            // Groq uses OpenAI-compatible format
            String system = (String) body.getOrDefault("system",
                    "You are Trail Guide, the AI safety assistant built into TourSafe — a smart tourist safety platform used at forest parks and trekking destinations in India.\n\n" +
                            "ABOUT TOURSAFE:\n" +
                            "TourSafe monitors tourist safety in real time using IoT wearable devices and a web platform. " +
                            "Every tourist wears a small ESP32-based wristband device that continuously tracks their safety.\n\n" +
                            "THE IOT WEARABLE DEVICE:\n" +
                            "- Worn on the wrist like a watch/band\n" +
                            "- GPS module (NEO-M8N) sends real-time location every 10 seconds to the TourSafe backend\n" +
                            "- MPU6050 accelerometer detects falls automatically and sends an immediate FALL alert\n" +
                            "- MAX30102 sensor monitors heart rate and SpO2 (blood oxygen) — detects cardiac stress, heat stroke, altitude sickness\n" +
                            "- SOS button: tourist presses it to send an emergency alert instantly\n" +
                            "- Connects via WiFi; if WiFi drops, it queues data and replays when reconnected\n" +
                            "- Battery lasts 12-16 hours with power optimization\n" +
                            "- If the device is removed or falls off, the last known GPS location is stored and visible to the admin and the tourist's group\n\n" +
                            "THE PLATFORM:\n" +
                            "- Admin dashboard: park rangers/safety staff monitor all tourists on a live map, see alerts in real time, manage zones and hotspots\n" +
                            "- Tourist app (where you are now): tourists see their group members on a map, view hotspots (rest stops, medical posts, water sources, shelters, food spots, viewpoints), receive safety alerts, and can send SOS\n" +
                            "- Groups: tourists are organized into groups. Group members can see each other's live GPS location on the map\n" +
                            "- Zones: park areas are marked with danger levels (0=safe to 4=extreme). Tourists get alerts when entering restricted zones\n" +
                            "- Hotspots: marked points of interest — REST_STOP, MEDICAL, WATER, SHELTER, FOOD_STALL, VIEWPOINT\n" +
                            "- Alerts: FALL (auto-detected), SOS (button press), MEDICAL, WILDLIFE, LOST, HIGH_HEART_RATE, ALTITUDE_RISK, ZONE_BREACH, OVERDUE_RETURN\n\n" +
                            "YOUR ROLE:\n" +
                            "Help tourists with: trail safety advice, what to do in emergencies, understanding their device, wildlife encounters, first aid, weather precautions, and navigating the app. " +
                            "Be aware that when a tourist says 'my device' or 'the wristband' or 'the tracking device', they mean the TourSafe IoT wearable. " +
                            "When a group member's device is found without the person, it likely fell off — the last GPS ping from the device is the last confirmed location of that person. " +
                            "Always remind tourists they can press the SOS button on their device or use the SOS button in this app for immediate help. " +
                            "Keep responses concise, practical, and calm. Use bullet points for action steps.");

            // Convert messages — prepend system message
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> incoming =
                    (List<Map<String, Object>>) body.getOrDefault("messages", List.of());

            List<Map<String, Object>> messages = new java.util.ArrayList<>();
            messages.add(Map.of("role", "system", "content", system));
            for (Map<String, Object> m : incoming) {
                String role    = (String) m.getOrDefault("role", "user");
                String content = (String) m.getOrDefault("content", "");
                if (!content.isBlank()) {
                    messages.add(Map.of("role", role, "content", content));
                }
            }

            Map<String, Object> reqBody = new LinkedHashMap<>();
            reqBody.put("model",       MODEL);
            reqBody.put("messages",    messages);
            reqBody.put("max_tokens",  600);
            reqBody.put("temperature", 0.7);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(groqKey);

            ResponseEntity<Map> response = http.exchange(
                    GROQ_URL, HttpMethod.POST,
                    new HttpEntity<>(reqBody, headers), Map.class
            );

            // OpenAI-compatible response: choices[0].message.content
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices =
                    (List<Map<String, Object>>) response.getBody().get("choices");

            String reply = "Sorry, no response generated.";
            if (choices != null && !choices.isEmpty()) {
                Map<?, ?> message = (Map<?, ?>) choices.get(0).get("message");
                if (message != null) reply = (String) message.get("content");
            }

            return ResponseEntity.ok(Map.of("reply", reply));

        } catch (HttpClientErrorException e) {
            return ResponseEntity.status(502)
                    .body(Map.of("error", "Groq API error: " + e.getResponseBodyAsString()));
        } catch (Exception e) {
            return ResponseEntity.status(502)
                    .body(Map.of("error", "Upstream error: " + e.getMessage()));
        }
    }
}
