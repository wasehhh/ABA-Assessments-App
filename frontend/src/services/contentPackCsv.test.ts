import { describe, expect, it } from 'vitest';
import { parseContentPackCsv } from '../services/contentPackCsv';

const LEGACY_CSV = [
    'domain_id,domain_title,domain_description,target_id,title,description,success_criteria,materials,instructions,examples,notes',
    'A,"Cooperation, Reinforcer",Domain context,A1,Gross motor imitation,Skill description,Independent for 8/10 trials,"Mirror, mat",Observe learner,Eg: clap,Starter',
    'A,,,A2,Attends reinforcer,Orients toward preferred stimuli,Orient within 3s for 80% probes,"Toys, reinforcers",Paired stimulus,,',
].join('\n');

describe('contentPackCsv', () => {
    it('imports legacy CSV with Alpha numeric 0-4 defaults', () => {
        const pack = parseContentPackCsv(LEGACY_CSV, 'Legacy Pack', 'Legacy');

        expect(pack.domains).toHaveLength(1);
        expect(pack.domains[0].targets).toHaveLength(2);
        expect(pack.domains[0].targets[0].scoring.type).toBe('numeric');
        expect(pack.domains[0].targets[0].scoring.scale).toEqual([0, 1, 2, 3, 4]);
        expect(pack.domains[0].targets[0].scoring.scale_labels).toEqual({});
        expect(pack.domains[0].targets[0].secondary_group_id).toBeUndefined();
        expect(pack.structure_labels).toBeUndefined();
    });

    it('imports optional secondary group columns', () => {
        const csv = [
            'domain_id,domain_title,target_id,title,success_criteria,secondary_group_id,secondary_group_title',
            'A,Level 1,T1,Target 1,Criteria,sg_listen,Listening',
            'A,,T2,Target 2,Criteria,sg_listen,',
            'A,,T3,Target 3,Criteria,sg_motor,Motor',
        ].join('\n');

        const pack = parseContentPackCsv(csv, 'Grouped Pack', '');

        expect(pack.structure_labels?.secondary_group).toBe('Secondary Group');
        expect(pack.domains[0].secondary_groups?.map((entry) => entry.secondary_group_id)).toEqual([
            'sg_listen',
            'sg_motor',
        ]);
        expect(pack.domains[0].targets[0].secondary_group_id).toBe('sg_listen');
        expect(pack.domains[0].targets[2].secondary_group_id).toBe('sg_motor');
    });

    it('imports optional scoring columns with scale labels', () => {
        const csv = [
            'domain_id,domain_title,target_id,title,success_criteria,scoring_type,scale,scale_labels',
            'A,Domain,T1,Target 1,Criteria,numeric,"0,1,2","0:Not Yet|1:Emerging|2:Mastered"',
        ].join('\n');

        const pack = parseContentPackCsv(csv, 'Labeled Pack', '');

        expect(pack.domains[0].targets[0].scoring.scale).toEqual([0, 1, 2]);
        expect(pack.domains[0].targets[0].scoring.scale_labels).toEqual({
            0: 'Not Yet',
            1: 'Emerging',
            2: 'Mastered',
        });
    });

    it('materializes imported scoring onto targets for Alpha safety', () => {
        const csv = [
            'domain_id,domain_title,target_id,title,success_criteria,scoring_type,scale,scale_labels',
            'A,Domain,T1,Target 1,Criteria,numeric,"0,1,2","0:Not Yet|1:Emerging|2:Mastered"',
        ].join('\n');

        const pack = parseContentPackCsv(csv, 'Labeled Pack', '');
        const scoring = pack.domains[0].targets[0].scoring;

        expect(scoring.scale).toEqual([0, 1, 2]);
        expect(scoring.scale_labels[2]).toBe('Mastered');
    });
});
