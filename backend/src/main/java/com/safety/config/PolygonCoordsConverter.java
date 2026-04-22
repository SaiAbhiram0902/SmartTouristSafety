package com.safety.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Converts double[][] polygon coordinates to/from a JSON TEXT column.
 * Each element is [longitude, latitude] — GeoJSON order.
 * Applied automatically on any Zone.polygonCoords field.
 */
@Converter
public class PolygonCoordsConverter implements AttributeConverter<double[][], String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(double[][] attribute) {
        if (attribute == null || attribute.length == 0) return null;
        try {
            return MAPPER.writeValueAsString(attribute);
        } catch (Exception e) {
            System.err.println("PolygonCoordsConverter write error: " + e.getMessage());
            return null;
        }
    }

    @Override
    public double[][] convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return null;
        try {
            return MAPPER.readValue(dbData, double[][].class);
        } catch (Exception e) {
            System.err.println("PolygonCoordsConverter read error: " + e.getMessage());
            return null;
        }
    }
}
