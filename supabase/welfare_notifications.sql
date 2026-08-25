-- Supabase SQL migration for Member Welfare Intake & Dual-Desk Incident Management
CREATE TABLE IF NOT EXISTS welfare_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  official_member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  cmo_family TEXT NOT NULL,
  event_category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location_or_hospital TEXT,
  incident_date DATE NOT NULL,
  status TEXT DEFAULT 'Submitted' NOT NULL,
  family_head_notes TEXT,
  family_head_verified_at TIMESTAMPTZ,
  welfare_officer_notes TEXT,
  welfare_officer_reviewed_at TIMESTAMPTZ,
  elevated_ticket_id TEXT REFERENCES welfare_tickets(ticket_id) ON DELETE SET NULL,
  chairman_read BOOLEAN DEFAULT FALSE NOT NULL,
  welfare_officer_read BOOLEAN DEFAULT FALSE NOT NULL,
  family_head_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_welfare_notifications_cmo_family ON welfare_notifications(cmo_family);
CREATE INDEX IF NOT EXISTS idx_welfare_notifications_official_member_id ON welfare_notifications(official_member_id);
CREATE INDEX IF NOT EXISTS idx_welfare_notifications_created_at ON welfare_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_welfare_notifications_status ON welfare_notifications(status);

-- Trigger for auto updated_at
CREATE OR REPLACE FUNCTION set_welfare_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_welfare_notifications_updated_at ON welfare_notifications;
CREATE TRIGGER trigger_welfare_notifications_updated_at
  BEFORE UPDATE ON welfare_notifications
  FOR EACH ROW EXECUTE PROCEDURE set_welfare_notifications_updated_at();
