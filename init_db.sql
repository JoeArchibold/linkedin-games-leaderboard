-- game defs
CREATE TABLE IF NOT EXISTS game_defs (
    game_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    game_name   TEXT   NOT NULL UNIQUE,
    score_units TEXT
);

-- players
CREATE TABLE IF NOT EXISTS players (
    player_id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    player_name              TEXT   NOT NULL UNIQUE,
    external_id              TEXT,
    is_on_public_leaderboard BOOLEAN NOT NULL DEFAULT FALSE
);

-- games by day
CREATE TABLE IF NOT EXISTS games_by_day (
    game_id          BIGINT      NOT NULL,
    game_number      INTEGER     NOT NULL,
    date             DATE        NOT NULL,
    avg_score        INTEGER,
    finalized        BOOLEAN     NOT NULL DEFAULT FALSE,
    avg_last_updated TIMESTAMP   NOT NULL DEFAULT now(),
    PRIMARY KEY (game_id, game_number),
    FOREIGN KEY (game_id) REFERENCES game_defs (game_id)
);

-- player game mapping
CREATE TABLE IF NOT EXISTS player_game_mapping (
    player_id   BIGINT      NOT NULL,
    game_id     BIGINT      NOT NULL,
    game_number INTEGER     NOT NULL,
    score       INTEGER     NOT NULL,
    no_hints    BOOLEAN     NOT NULL DEFAULT FALSE,
    no_mistake  BOOLEAN     NOT NULL DEFAULT FALSE,
    updated_ts  TIMESTAMP   NOT NULL DEFAULT now(),
    PRIMARY KEY (player_id, game_id, game_number),
    FOREIGN KEY (player_id) REFERENCES players (player_id),
    FOREIGN KEY (game_id, game_number) REFERENCES games_by_day (game_id, game_number)
);

-- leaderboard_last_updated is derived: the most recent updated_ts among the
-- player_game_mapping rows matching a (game_id, game_number).
CREATE OR REPLACE VIEW games_by_day_with_updates AS
SELECT
    g.game_id,
    g.game_number,
    g.date,
    g.avg_score,
    g.finalized,
    g.avg_last_updated,
    MAX(m.updated_ts) AS leaderboard_last_updated
FROM games_by_day g
LEFT JOIN player_game_mapping m
    ON m.game_id = g.game_id AND m.game_number = g.game_number
GROUP BY g.game_id, g.game_number, g.date, g.avg_score, g.finalized, g.avg_last_updated;
