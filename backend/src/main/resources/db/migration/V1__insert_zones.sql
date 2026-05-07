CREATE TABLE IF NOT EXISTS zone (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255),
    min_lat     DOUBLE PRECISION,
    max_lat     DOUBLE PRECISION,
    min_lon     DOUBLE PRECISION,
    max_lon     DOUBLE PRECISION,
    restricted  BOOLEAN,
    danger_level INTEGER
);

INSERT INTO zone (name, min_lat, max_lat, min_lon, max_lon, restricted, danger_level)
VALUES
  ('Hyderabad Restricted Area', 17.38, 17.40, 78.47, 78.49, TRUE, 3),
  ('Park Safe Zone', 17.45, 17.50, 78.50, 78.55, FALSE, 0);
