-- Migration: add rejection feedback column to applications
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS rejection_feedback TEXT;

-- Optional: create an index to quickly search for applications with feedback
CREATE INDEX IF NOT EXISTS idx_applications_rejection_feedback ON applications (rejection_feedback);
