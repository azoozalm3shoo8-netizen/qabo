ALTER TABLE auctions ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(category, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(city, '')), 'D')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_auctions_fts ON auctions USING gin(fts);
CREATE INDEX IF NOT EXISTS idx_auctions_category ON auctions(category);
CREATE INDEX IF NOT EXISTS idx_auctions_city ON auctions(city);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_ends_at ON auctions(ends_at);
CREATE INDEX IF NOT EXISTS idx_auctions_current_bid ON auctions(current_bid);
