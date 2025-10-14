package utils;

import models.Tourist;
import java.util.HashMap;

public class DataStore {
    private static HashMap<String, Tourist> tourists = new HashMap<>();

    public static void registerTourist(Tourist t) {
        tourists.put(t.getId(), t);
    }

    public static Tourist getTourist(String id) {
        return tourists.get(id);
    }

    public static HashMap<String, Tourist> getAllTourists() {
        return tourists;
    }
}
