const fs = require('fs');

const domains = [];
for (let d = 1; d <= 20; d++) {
    const domainId = `D${d}`;
    const targets = [];
    for (let t = 1; t <= 5; t++) {
        targets.push({
            target_id: `${domainId}-T${t}`,
            title: `Target ${t} for Domain ${d}`,
            success_criteria: "80% accuracy",
            description: "Auto-generated target for testing",
            scoring: {
                type: "numeric",
                scale: [0, 1, 2, 3, 4],
                no_opportunity_allowed: true,
                scale_labels: {
                    "0": "No Response",
                    "1": "Physical Prompt",
                    "2": "Partial Prompt",
                    "3": "Verbal Prompt",
                    "4": "Independent"
                }
            }
        });
    }

    domains.push({
        domain_id: domainId,
        title: `Test Domain ${d} - Long Title for Testing Layout`,
        description: `Description for domain ${d}. This domain focuses on performance testing of the grid and report generation.`,
        targets: targets
    });
}

const packData = {
    pack_id: "large_test_pack_001",
    title: "Large Performance Test Pack (20x5)",
    description: "A large dataset containing 20 domains and 100 targets to test system limits and scroll performance.",
    version: "1.0",
    domains: domains
};

const sql = `
-- Seed Large Test Pack
INSERT INTO content_packs (org_id, title, description, version, pack_data, status, created_at, uploaded_at)
SELECT 
  id as org_id,
  '${packData.title}',
  '${packData.description}',
  '${packData.version}',
  '${JSON.stringify(packData).replace(/'/g, "''")}'::jsonb,
  'active',
  NOW(),
  NOW()
FROM organizations
LIMIT 1;
`;

console.log(sql);
