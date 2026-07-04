-- Postgres schema for icke-scores (run once against the Neon database).
--
-- Modeled on what the frontend actually sends and reads — NOT on the old MySQL
-- layout. Notably there is no "tournaments" table: the old one was never fetched
-- or referenced by the app (games carry their own sitting flag, groups belong to
-- a cup), and the PHP API silently inserted NULLs for it.
--
-- IDs are client-generated strings (uuid), timestamps are stored as text in the
-- local wall-clock format the frontend produces ("2025-06-14T09:00:00"), which
-- sorts correctly as text.

CREATE TABLE icke_cups (
  id         TEXT PRIMARY KEY,
  created_at TEXT,
  title      TEXT NOT NULL,
  address    TEXT,
  -- frontend logic keys off these exact strings (getActiveCup); reject typos at the DB
  state      TEXT NOT NULL DEFAULT 'Bevorstehend'
             CHECK (state IN ('Bevorstehend', 'Vorrunde', 'Finalrunde', 'Abgeschlossen'))
);

CREATE TABLE teams (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  contact     TEXT,
  final_place INT,
  icke_cup_id TEXT NOT NULL REFERENCES icke_cups(id) ON DELETE CASCADE
);

-- "groups" is a reserved word in Postgres; keep the table name (API parity) but quote it.
-- A–D are created with the cup, E–H by the frontend when the Finalrunde starts.
CREATE TABLE "groups" (
  id          TEXT PRIMARY KEY,
  icke_cup_id TEXT NOT NULL REFERENCES icke_cups(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  -- the app identifies groups by name within a cup; duplicates would corrupt
  -- team assignment and ranking lookups
  UNIQUE (icke_cup_id, name)
);

CREATE TABLE group_teams (
  group_id TEXT NOT NULL REFERENCES "groups"(id) ON DELETE CASCADE,
  team_id  TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, team_id)
);

-- team FKs deliberately have no ON DELETE action: deleting a single team that
-- already has games is rejected (would corrupt rankings), while deleting a whole
-- cup still works because its games are removed in the same cascade.
CREATE TABLE games (
  id          TEXT PRIMARY KEY,
  icke_cup_id TEXT NOT NULL REFERENCES icke_cups(id) ON DELETE CASCADE,
  team_1_id   TEXT NOT NULL REFERENCES teams(id),
  team_2_id   TEXT NOT NULL REFERENCES teams(id),
  start_at    TEXT,
  round       TEXT CHECK (round IN ('Vorrunde', 'Finalrunde')),
  sitting     INT NOT NULL DEFAULT 0,
  court       INT
);

-- Round winners are NOT stored: they are derived from points in the games query.
CREATE TABLE rounds (
  id            TEXT PRIMARY KEY,
  game_id       TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_number  INT NOT NULL,
  points_team_1 INT NOT NULL DEFAULT 0 CHECK (points_team_1 >= 0),
  points_team_2 INT NOT NULL DEFAULT 0 CHECK (points_team_2 >= 0),
  -- the games list LEFT JOINs rounds by (game_id, round_number); a duplicate round
  -- (e.g. a double-submitted request) would duplicate rows in every game query
  UNIQUE (game_id, round_number)
);
