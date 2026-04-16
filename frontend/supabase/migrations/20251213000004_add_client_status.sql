-- Add status column to clients table for soft delete / archiving support
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Optional: Index on status for performance if filtering becomes common
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
