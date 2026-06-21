import { describe, expect, it } from 'vitest';
import { LearnerMapDomain } from '../../services/learnerMapProfile';
import { resolveAppendixDomains, buildDomainIndexById } from './learnerMapExportMode';

function makeDomain(domainId: string, title: string): LearnerMapDomain {
    return {
        domainId,
        title,
        targets: [],
    };
}

describe('resolveAppendixDomains', () => {
    const domains = [
        makeDomain('DOM_1', 'Domain 1'),
        makeDomain('DOM_2', 'Domain 2'),
        makeDomain('DOM_3', 'Domain 3'),
    ];

    it('returns all domains for full mode', () => {
        expect(resolveAppendixDomains(domains, 'full')).toEqual(domains);
    });

    it('returns no domains for standard mode', () => {
        expect(resolveAppendixDomains(domains, 'standard', ['DOM_2'])).toEqual([]);
    });

    it('returns selected domains in assessment order', () => {
        expect(resolveAppendixDomains(domains, 'selected-domains', ['DOM_3', 'DOM_1'])).toEqual([
            domains[0],
            domains[2],
        ]);
    });

    it('returns no domains when selected-domains mode has empty selection', () => {
        expect(resolveAppendixDomains(domains, 'selected-domains', [])).toEqual([]);
    });

    it('ignores unknown domain ids and returns only known matches', () => {
        expect(
            resolveAppendixDomains(domains, 'selected-domains', ['DOM_99', 'DOM_1'])
        ).toEqual([domains[0]]);
    });
});

describe('buildDomainIndexById', () => {
    const domains = [
        makeDomain('DOM_1', 'Domain 1'),
        makeDomain('DOM_2', 'Domain 2'),
        makeDomain('DOM_3', 'Domain 3'),
    ];

    it('preserves original domain indices for color continuity', () => {
        expect(buildDomainIndexById(domains)).toEqual({
            DOM_1: 0,
            DOM_2: 1,
            DOM_3: 2,
        });
    });
});
