import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const layoutSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), './Layout.tsx'),
    'utf8'
);

describe('Layout tablet nav contract (§3.1–§3.3)', () => {

    it('gates desktop nav and drawer at lg (1024), not md (768)', () => {
        expect(layoutSource).toMatch(/hidden lg:flex[\s\S]*data-layout-desktop-nav/);
        expect(layoutSource).toMatch(/hidden lg:flex[\s\S]*data-layout-desktop-account/);
        expect(layoutSource).toMatch(/lg:hidden[\s\S]*Open menu|aria-label=\{isMobileMenuOpen/);
        expect(layoutSource).toContain('lg:hidden border-t border-gray-100');
        expect(layoutSource).not.toMatch(/hidden md:flex/);
        expect(layoutSource).not.toMatch(/md:hidden/);
    });

    it('includes Org and Audit in the compact drawer, admin-gated', () => {
        expect(layoutSource).toContain('data-layout-drawer-org');
        expect(layoutSource).toContain('data-layout-drawer-audit');
        expect(layoutSource).toMatch(
            /\{isAdmin && \(\s*<button[\s\S]*data-layout-drawer-org/
        );
        expect(layoutSource).toMatch(
            /\{isAdmin && \(\s*<button[\s\S]*data-layout-drawer-audit/
        );
        expect(layoutSource).toContain('#/org-settings');
        expect(layoutSource).toContain('#/audit-log');
    });

    it('keeps non-scoring destinations in a secondary drawer group', () => {
        expect(layoutSource).toContain('data-layout-drawer-secondary');
        const secondaryIdx = layoutSource.indexOf('data-layout-drawer-secondary');
        const clientsFirst = layoutSource.indexOf("closeDrawerAndNavigate('#/clients')");
        const assessmentsFirst = layoutSource.indexOf(
            "closeDrawerAndNavigate('#/assessments')"
        );
        expect(clientsFirst).toBeGreaterThan(-1);
        expect(assessmentsFirst).toBeGreaterThan(-1);
        expect(clientsFirst).toBeLessThan(secondaryIdx);
        expect(assessmentsFirst).toBeLessThan(secondaryIdx);
        expect(layoutSource.indexOf("closeDrawerAndNavigate('#/dashboard')")).toBeGreaterThan(
            secondaryIdx
        );
        expect(layoutSource.indexOf("closeDrawerAndNavigate('#/packs')")).toBeGreaterThan(
            secondaryIdx
        );
        expect(layoutSource.indexOf('data-layout-drawer-org')).toBeGreaterThan(secondaryIdx);
        expect(layoutSource.indexOf('data-layout-drawer-audit')).toBeGreaterThan(secondaryIdx);
    });

    it('collapses lg+ account actions into a single Account menu with visible labels inside', () => {
        expect(layoutSource).toContain('data-layout-desktop-account-trigger');
        expect(layoutSource).toContain('data-layout-desktop-account-menu');
        expect(layoutSource).toContain('aria-label="Account"');
        expect(layoutSource).toMatch(
            /data-layout-desktop-account-menu[\s\S]*Account Settings[\s\S]*Sign Out/
        );
        const desktopAccountBlock = layoutSource.slice(
            layoutSource.indexOf('data-layout-desktop-account'),
            layoutSource.indexOf('Compact menu button')
        );
        expect(desktopAccountBlock).not.toContain('>Account Settings</span>');
        expect(desktopAccountBlock).not.toMatch(
            /data-layout-desktop-account[\s\S]*aria-label="Sign Out"[\s\S]*>Sign Out<\/span>/
        );
    });

    it('exposes Sign Out as a labeled control with accessible name in the compact drawer (not title-only)', () => {
        expect(layoutSource).toMatch(
            /data-layout-compact-drawer[\s\S]*aria-label="Sign Out"[\s\S]*>\s*Sign Out/
        );
        expect(layoutSource).toMatch(
            /data-layout-desktop-account-menu[\s\S]*>\s*Sign Out/
        );
        expect(layoutSource).toContain('min-h-11');
        expect(layoutSource).not.toMatch(/title="Sign Out"|title="Account Settings"/);
    });
});

describe('C4b Layout Clients current', () => {
    it('wires Clients nav to isClientsLayoutNavCurrent', () => {
        expect(layoutSource).toContain('isClientsLayoutNavCurrent');
        expect(layoutSource).toContain("aria-current={clientsNavCurrent ? 'page' : undefined}");
    });
});
