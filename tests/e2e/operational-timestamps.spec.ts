import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const password = 'E2E-only-password';

const formatter = new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
});

async function login(page: Page, username: string, landing: string) {
    await page.goto('/login');
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL((url) => url.pathname === landing);
}

async function logout(page: Page) {
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login$/);
}

async function expectOperationalTimestamps(scope: Locator, minimum: number) {
    const timestamps = scope.locator('time[datetime]:visible');
    await expect.poll(() => timestamps.count()).toBeGreaterThanOrEqual(minimum);
    const count = await timestamps.count();

    for (let index = 0; index < count; index += 1) {
        const timestamp = timestamps.nth(index);
        const rawValue = await timestamp.getAttribute('datetime');

        expect(rawValue).not.toBeNull();
        await expect(timestamp).toHaveAttribute('title', rawValue!);
        await expect(timestamp).toHaveText(formatter.format(new Date(rawValue!)));
    }
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
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
}

function detail(page: Page, label: string) {
    return page
        .locator('dt')
        .filter({ hasText: new RegExp(`^${label}$`) })
        .locator('xpath=..');
}

test('Case and Resolution lifecycle history uses stable operational timestamps', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, 'e2e_admin', '/dashboard');
    await page.goto('/cases');
    await page.getByRole('link', { name: 'Open case III-09-INV-26G-0001' }).click();

    await expectOperationalTimestamps(page.locator('main'), 6);
    for (const label of ['Date', '1st Hearing', '2nd Hearing']) {
        await expect(detail(page, label).locator('time')).toHaveCount(0);
    }

    await page.getByRole('link', { name: 'View Resolution' }).click();
    await page.waitForURL(/\/resolutions\/[0-9a-f-]+$/);
    const resolutionUrl = new URL(page.url());
    const resolutionId = resolutionUrl.pathname.split('/').at(-1);
    expect(resolutionId).toBeTruthy();

    await expectOperationalTimestamps(page.locator('main'), 2);
    await expect(detail(page, 'Verdict Date').locator('time')).toHaveCount(0);

    await page.goto(`/resolution-reviews/${resolutionId}`);
    await expectOperationalTimestamps(page.locator('main'), 2);

    await page.setViewportSize({ width: 375, height: 812 });
    await expectOperationalTimestamps(page.locator('main'), 2);
    await expectNoSeriousAccessibilityViolations(page);
});

test('Subpoena review and document history preserve raw timestamp values', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 768, height: 1024 });
    await login(page, 'e2e_prosecutor', '/subpoena-reviews');
    await page.getByRole('link', { name: 'Review', exact: true }).first().click();

    await expectOperationalTimestamps(page.locator('main'), 1);
    for (const label of ['1st Hearing', '2nd Hearing']) {
        await expect(detail(page, label).locator('time')).toHaveCount(0);
    }

    await page.setViewportSize({ width: 375, height: 812 });
    const revisionDetails = page.getByLabel('Revision submission details');
    await expect(revisionDetails).toContainText('Submitted by Not set | Not set');
    await expectOperationalTimestamps(revisionDetails, 1);
    await expectNoSeriousAccessibilityViolations(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await logout(page);
    await login(page, 'e2e_secretary', '/cases');
    const pendingCase = page.getByRole('row').filter({ hasText: 'III-09-INV-26G-0002' });
    await pendingCase.getByRole('button', { name: 'Generate PDF' }).click();
    await expect(page).toHaveURL(/\/cases\/[0-9a-f-]+$/);

    const documentHistory = page
        .getByRole('heading', { name: 'Subpoena PDF' })
        .locator('xpath=../..');
    await expectOperationalTimestamps(documentHistory, 1);
    await expectNoSeriousAccessibilityViolations(page);
});
