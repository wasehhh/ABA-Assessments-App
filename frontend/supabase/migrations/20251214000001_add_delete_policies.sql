-- Add DELETE policies for Clients and Content Packs

-- 1. Clients
CREATE POLICY "Users can delete clients in their org"
ON clients FOR DELETE
USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- 2. Content Packs
CREATE POLICY "Users can delete packs in their org"
ON content_packs FOR DELETE
USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));
