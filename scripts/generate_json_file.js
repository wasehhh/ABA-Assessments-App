const fs = require('fs');
const path = require('path');

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
        title: `Test Domain ${d} - Long Title`,
        description: `Description for domain ${d}. Performance testing data.`,
        targets: targets
    });
}

const packData = {
    pack_id: "large_test_pack_json",
    title: "Large Test Pack (20x5) - JSON Import",
    description: "A large dataset for testing UI upload and rendering.",
    version: "1.0",
    domains: domains
};

const outDir = path.join(__dirname, '..', 'tests', 'data');
const outFile = path.join(outDir, 'large_test_pack.json');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(packData, null, 2));
console.log('Generated', outFile);
