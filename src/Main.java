import models.Tourist;
import models.TouristSimulation;

public class Main {
    public static void main(String[] args) {
        Tourist t1 = new Tourist("T001", "Alice", 26.910, 75.785);
        Tourist t2 = new Tourist("T002", "Bob", 26.920, 75.795);
        Tourist t3 = new Tourist("T003", "Charlie", 26.915, 75.790);

        Thread th1 = new Thread(new TouristSimulation(t1));
        Thread th2 = new Thread(new TouristSimulation(t2));
        Thread th3 = new Thread(new TouristSimulation(t3));

        th1.start();
        th2.start();
        th3.start();
    }
}
