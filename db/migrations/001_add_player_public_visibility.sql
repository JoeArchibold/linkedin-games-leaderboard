-- Per-player visibility toggle for the public leaderboard.
--
-- Privacy default is hidden (FALSE); admins opt players in via the admin
-- dashboard (Phase B). The public leaderboard pages in Phase A do NOT filter on
-- this yet (they show every recorded player) — the flag takes effect in Phase B.
ALTER TABLE players
    ADD COLUMN IF NOT EXISTS is_on_public_leaderboard BOOLEAN NOT NULL DEFAULT FALSE;
