-- Migration: 012_create_horoscope_matches_table.sql
-- Description: Create horoscope_matches table for compatibility scores
-- Date: 2024-01-13

-- UP: Create table
CREATE TABLE IF NOT EXISTS horoscope_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Profiles being matched
  profile1_id UUID NOT NULL REFERENCES marriage_profiles(id) ON DELETE CASCADE,
  profile2_id UUID NOT NULL REFERENCES marriage_profiles(id) ON DELETE CASCADE,
  
  -- 10 Poruthams (compatibility scores)
  dina_porutham INTEGER DEFAULT 0,     -- 0-4 points
  gana_porutham INTEGER DEFAULT 0,     -- 0-6 points
  yoni_porutham INTEGER DEFAULT 0,     -- 0-4 points
  rasi_porutham INTEGER DEFAULT 0,     -- 0-7 points
  rajju_porutham INTEGER DEFAULT 0,    -- 0-8 points
  vasya_porutham INTEGER DEFAULT 0,    -- 0-2 points
  mahendra_porutham INTEGER DEFAULT 0, -- 0-5 points
  stri_dirgha_porutham INTEGER DEFAULT 0, -- 0-3 points
  vedha_porutham INTEGER DEFAULT 0,    -- 0-2 points
  bhakut_porutham INTEGER DEFAULT 0,   -- 0-4 points
  
  -- Total Score
  total_score INTEGER DEFAULT 0,       -- 0-45 maximum
  percentage INTEGER DEFAULT 0,        -- 0-100%
  rating VARCHAR(50), -- 'excellent'|'good'|'average'|'poor'
  
  -- Timestamps
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraint
  UNIQUE(profile1_id, profile2_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_horoscope_matches_profile1_id ON horoscope_matches(profile1_id);
CREATE INDEX IF NOT EXISTS idx_horoscope_matches_profile2_id ON horoscope_matches(profile2_id);
CREATE INDEX IF NOT EXISTS idx_horoscope_matches_total_score ON horoscope_matches(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_horoscope_matches_percentage ON horoscope_matches(percentage DESC);
CREATE INDEX IF NOT EXISTS idx_horoscope_matches_rating ON horoscope_matches(rating);

-- DOWN: Drop table
-- DROP TABLE IF EXISTS horoscope_matches CASCADE;
