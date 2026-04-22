package com.safety.service;

import com.safety.model.Alert;
import com.safety.model.Tourist;
import com.safety.repository.TouristRepository;
import com.twilio.Twilio;
import com.twilio.exception.ApiException;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Sends emergency notifications via:
 *   1. Twilio WhatsApp sandbox (primary)
 *   2. Twilio SMS (automatic fallback if WhatsApp fails)
 *
 * Setup — add to application-local.properties:
 *   twilio.account.sid=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   twilio.auth.token=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   twilio.whatsapp.from=whatsapp:+14155238886
 *   twilio.sms.from=+13613161058
 *
 * Emergency contact phone numbers must be in E.164 format: +919876543210
 * For WhatsApp sandbox: the contact must have sent the join message once.
 */
@Service
public class NotificationService {

    @Autowired
    private TouristRepository touristRepository;

    @Value("${twilio.account.sid}")
    private String accountSid;

    @Value("${twilio.auth.token}")
    private String authToken;

    @Value("${twilio.whatsapp.from:whatsapp:+14155238886}")
    private String whatsappFrom;

    @Value("${twilio.sms.from:+13613161058}")
    private String smsFrom;

    @PostConstruct
    public void init() {
        Twilio.init(accountSid, authToken);
        System.out.println("[Notification] Twilio initialised — WhatsApp: "
                + whatsappFrom + " | SMS: " + smsFrom);
    }

    /**
     * Sends an emergency alert to the tourist's registered emergency contact.
     * Tries WhatsApp first; if that fails (e.g. number not in sandbox),
     * automatically falls back to SMS.
     */
    public void sendEmergencyAlert(String touristId, Alert alert) {
        touristRepository.findById(touristId).ifPresent(tourist -> {
            String phone = resolveE164(tourist.getEmergencyContact());
            if (phone == null) {
                System.out.println("[Notification] SKIPPED — no valid emergency contact for " + touristId);
                return;
            }

            String body = buildMessage(tourist, alert);

            // Try WhatsApp first
            boolean whatsappOk = sendWhatsApp(phone, body, touristId);

            // Fall back to SMS if WhatsApp failed
            if (!whatsappOk) {
                sendSms(phone, body, touristId);
            }
        });
    }

    // ── WhatsApp via Twilio sandbox ───────────────────────────────────────

    private boolean sendWhatsApp(String toPhone, String body, String touristId) {
        try {
            Message msg = Message.creator(
                    new PhoneNumber("whatsapp:" + toPhone),
                    new PhoneNumber(whatsappFrom),
                    body
            ).create();

            System.out.println("[Notification] WhatsApp sent to " + toPhone
                    + " | SID: " + msg.getSid()
                    + " | Status: " + msg.getStatus());
            return true;

        } catch (ApiException e) {
            System.err.println("[Notification] WhatsApp failed for " + touristId
                    + " — " + e.getCode() + ": " + e.getMessage()
                    + " → falling back to SMS");
            return false;
        } catch (Exception e) {
            System.err.println("[Notification] WhatsApp unexpected error for "
                    + touristId + ": " + e.getMessage() + " → falling back to SMS");
            return false;
        }
    }

    // ── SMS via Twilio ────────────────────────────────────────────────────

    private void sendSms(String toPhone, String body, String touristId) {
        try {
            Message msg = Message.creator(
                    new PhoneNumber(toPhone),
                    new PhoneNumber(smsFrom),
                    body
            ).create();

            System.out.println("[Notification] SMS sent to " + toPhone
                    + " | SID: " + msg.getSid()
                    + " | Status: " + msg.getStatus());

        } catch (ApiException e) {
            System.err.println("[Notification] SMS failed for " + touristId
                    + " — " + e.getCode() + ": " + e.getMessage());
        } catch (Exception e) {
            System.err.println("[Notification] SMS unexpected error for "
                    + touristId + ": " + e.getMessage());
        }
    }

    // ── Message body builder ──────────────────────────────────────────────

    private String buildMessage(Tourist tourist, Alert alert) {
        String mapsLink = extractMapsLink(alert.getMessage());
        return "🚨 TourSafe ALERT [" + alert.getType() + "]\n"
                + "Tourist: " + tourist.getName() + " (" + tourist.getTouristId() + ")\n"
                + alert.getMessage()
                + (mapsLink.isEmpty() ? "" : "\n📍 " + mapsLink);
    }

    private String extractMapsLink(String message) {
        if (message == null) return "";
        try {
            int start = message.lastIndexOf("(");
            int end   = message.lastIndexOf(")");
            if (start != -1 && end > start) {
                String coords = message.substring(start + 1, end);
                String[] parts = coords.split(",");
                if (parts.length == 2) {
                    String lat = parts[0].trim();
                    String lon = parts[1].trim();
                    // Validate they're numeric
                    Double.parseDouble(lat);
                    Double.parseDouble(lon);
                    return "https://maps.google.com/?q=" + lat + "," + lon;
                }
            }
        } catch (Exception ignored) {}
        return "";
    }

    // ── Phone number normalisation ────────────────────────────────────────

    /**
     * Converts various Indian phone number formats to E.164 (+91XXXXXXXXXX).
     * Handles: "9876543210", "919876543210", "+919876543210", "09876543210"
     * Returns null if the number can't be normalised to a valid format.
     */
    private String resolveE164(String raw) {
        if (raw == null || raw.isBlank()) return null;

        // Strip spaces, dashes, dots
        String digits = raw.replaceAll("[\\s\\-\\.()]", "");

        // Already E.164
        if (digits.startsWith("+")) {
            return digits.length() >= 10 ? digits : null;
        }

        // Strip leading zeros
        digits = digits.replaceAll("^0+", "");

        // 10-digit Indian mobile number — prepend country code
        if (digits.length() == 10 && digits.matches("[6-9]\\d{9}")) {
            return "+91" + digits;
        }

        // Already has country code (91XXXXXXXXXX)
        if (digits.length() == 12 && digits.startsWith("91")) {
            return "+" + digits;
        }

        // Other country — assume they've provided full digits without +
        if (digits.length() >= 10) {
            return "+" + digits;
        }

        System.err.println("[Notification] Could not normalise phone number: " + raw);
        return null;
    }
}
