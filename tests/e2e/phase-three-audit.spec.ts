import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { formatAuditArea, formatAuditSubjectType } from '../../resources/js/Components/audit';

const password = 'E2E-only-password';

async function login(page: Page, username: string, landing: string) {
    await page.goto('/login');
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL((url) => url.pathname === landing);
}

async function expectNoSeriousAccessibilityViolations(page: Page) {
    const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

    expect(
        results.violations.filter((violation) =>
            ['serious', 'critical'].includes(violation.impact ?? ''),
        ),
    ).toEqual([]);
}

async function expectNoPageOverflow(page: Page) {
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
}

async function expectAuditFilterState(page: Page) {
    await expect
        .poll(() => {
            const url = new URL(page.url());

            return {
                path: url.pathname,
                search: url.searchParams.get('search'),
                filter: url.searchParams.get('filter'),
                sort: url.searchParams.get('sort'),
                order: url.searchParams.get('order'),
            };
        })
        .toEqual({
            path: '/admin/audit',
            search: 'auth.login',
            filter: 'action',
            sort: 'timestamp',
            order: 'desc',
        });
}

test('Audit History preserves list state while improving row navigation and scanability', async ({
    page,
}) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, 'e2e_admin', '/dashboard');
    await page.goto('/admin/audit');

    await page.getByLabel('Search', { exact: true }).fill('auth.login');
    await page.getByLabel('Filter').selectOption('action');
    await page.getByRole('button', { name: 'Search' }).click();
    await expectAuditFilterState(page);
    await expect(page.getByRole('link', { name: 'Clear filters' })).toHaveAttribute(
        'href',
        '/admin/audit',
    );

    const firstEvent = page.getByRole('list', { name: 'Audit events' }).locator('article').first();
    await expect(firstEvent.getByText('Area: Auth', { exact: true })).toBeVisible();
    await expect(firstEvent.getByText('Actor', { exact: true })).toBeVisible();
    await expect(firstEvent.getByText('Role', { exact: true })).toBeVisible();
    await expect(firstEvent.getByText('View details', { exact: true })).toBeVisible();

    const rowLink = firstEvent.getByRole('link', { name: /View details for .* audit event/ });
    const detailPath = await rowLink.getAttribute('href');
    expect(detailPath).toMatch(/^\/admin\/audit\/[0-9a-f-]+$/);
    await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
    });
    await rowLink.focus();
    await expect(rowLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${detailPath}$`));
    await page.goBack();
    await expectAuditFilterState(page);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(100);

    await expectNoPageOverflow(page);
    await expectNoSeriousAccessibilityViolations(page);

    for (const viewport of [
        { width: 768, height: 1024 },
        { width: 375, height: 812 },
    ]) {
        await page.setViewportSize(viewport);
        await page.reload();
        await expectNoPageOverflow(page);
        await expectNoSeriousAccessibilityViolations(page);
    }
});

test('Audit presentation helpers derive labels without inferring unknown values', () => {
    expect(formatAuditArea('resolution.approved')).toBe('Resolution');
    expect(formatAuditArea('unknown.event')).toBe('Area unavailable');
    expect(formatAuditArea('../case.created')).toBe('Area unavailable');
    expect(formatAuditSubjectType('App\\Models\\LegalCase')).toBe('Legal Case');
    expect(formatAuditSubjectType('CaseReport')).toBe('Case Report');
    expect(formatAuditSubjectType('App/Models/LegalCase')).toBe('Target unavailable');
    expect(formatAuditSubjectType(null)).toBe('Target unavailable');
});

test('Audit detail preserves exact evidence while clarifying target and transition data', async ({
    page,
}) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, 'e2e_admin', '/dashboard');
    await page.goto(
        '/admin/audit?search=subpoena.approved&filter=action&sort=timestamp&order=desc',
    );

    const eventLink = page
        .getByRole('region', { name: 'Audit History' })
        .locator('article')
        .first()
        .getByRole('link', {
            name: 'View details for Subpoena Approved audit event',
        });
    await expect(eventLink).toBeVisible();
    await eventLink.click();

    await expect(page.getByRole('heading', { name: 'Subpoena Approved' })).toBeVisible();
    await expect(page.getByText('Target Type').locator('..')).toContainText('Legal Case');

    const exactTimestamp = await page.locator('time').getAttribute('title');
    expect(exactTimestamp).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    await expect(page.locator('time')).toContainText(exactTimestamp ?? '');
    await expect(page.locator('time')).toHaveAttribute(
        'dateTime',
        exactTimestamp?.replace(' ', 'T') ?? '',
    );

    const transition = page.getByRole('region', { name: 'Recorded transition' });
    await expect(transition.getByText('From', { exact: true })).toBeVisible();
    await expect(transition.getByText('Pending', { exact: true })).toBeVisible();
    await expect(transition.getByText('To', { exact: true })).toBeVisible();
    await expect(transition.getByText('Approved', { exact: true })).toBeVisible();
    await expect(page.getByText('Docket Number', { exact: true })).toBeVisible();
    await expect(page.getByText('docket_number', { exact: true })).toBeVisible();

    await page.getByText('Technical identifiers', { exact: true }).click();
    await expect(page.getByText('Subject Type', { exact: true }).locator('..')).toContainText(
        'App\\Models\\LegalCase',
    );
    await expect(page.getByText('Event Type', { exact: true }).locator('..')).toContainText(
        'subpoena.approved',
    );

    await expectNoPageOverflow(page);
    await expectNoSeriousAccessibilityViolations(page);

    for (const viewport of [
        { width: 768, height: 1024 },
        { width: 375, height: 812 },
    ]) {
        await page.setViewportSize(viewport);
        await page.reload();
        await expectNoPageOverflow(page);
        await expectNoSeriousAccessibilityViolations(page);
    }
});
