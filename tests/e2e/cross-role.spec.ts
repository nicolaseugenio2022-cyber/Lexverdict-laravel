import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const password = 'E2E-only-password';

async function login(page: Page, username: string, landing: string) {
    await page.goto('/login');
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL((url) => url.pathname === landing);
    expect(new URL(page.url()).pathname).toBe(landing);
}

async function logout(page: Page) {
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login$/);
}

test('each staff role receives only its approved navigation and route access', async ({ page }) => {
    await login(page, 'e2e_admin', '/dashboard');
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reports' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Audit' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Resolution Review' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Subpoena Review' })).toHaveCount(0);
    await logout(page);

    await login(page, 'e2e_prosecutor', '/subpoena-reviews');
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Subpoena Review' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reports' })).toHaveCount(0);
    let response = await page.goto('/admin/reports');
    expect(response?.status()).toBe(403);
    response = await page.goto('/dashboard');
    expect(response?.status()).toBe(403);
    await page.goto('/subpoena-reviews');
    await logout(page);

    await login(page, 'e2e_secretary', '/cases');
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Cases' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Subpoena Review' })).toHaveCount(0);
    response = await page.goto('/resolution-reviews');
    expect(response?.status()).toBe(403);
    response = await page.goto('/dashboard');
    expect(response?.status()).toBe(403);
    await page.goto('/cases');
    await logout(page);

    await login(page, 'e2e_process_server', '/process-server/cases');
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Cases' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reports' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: /Docket Number/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Resolution Verdict/ })).toBeVisible();
    const approvedCaseRow = page.getByRole('row').filter({ hasText: 'RTC Cabanatuan' });
    await expect(approvedCaseRow.getByText('Qualified Theft', { exact: true })).toBeVisible();
    await expect(approvedCaseRow.getByText('For Filing', { exact: true })).toBeVisible();
    await expect(approvedCaseRow.getByText('RTC Cabanatuan', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View' })).toHaveCount(0);
    response = await page.goto('/dashboard');
    expect(response?.status()).toBe(403);
});

test('public lookup and administrator report preserve approved behavior', async ({ page }) => {
    await page.goto('/docket');
    await page.getByLabel('Docket Number').fill('III-09-INV-26G-0001');
    await page.getByLabel('PIN Code').fill('246810');
    await page.getByRole('button', { name: 'Access' }).click();
    await expect(page.getByText('For Filing', { exact: true })).toBeVisible();
    await expect(page.getByText('RTC Cabanatuan', { exact: true })).toBeVisible();

    await login(page, 'e2e_admin', '/dashboard');
    await page.getByRole('link', { name: 'Reports' }).click();
    await page.getByRole('button', { name: 'Generate' }).click();
    await expect(
        page.getByText('Select report filters and generate the Case Report.'),
    ).toBeVisible();
    await page.getByLabel('Case Status').selectOption('For Filing');
    await page.getByRole('button', { name: 'Generate' }).click();
    await expect(page.getByText('Total Cases')).toBeVisible();
    await expect(page.getByText('Qualified Theft', { exact: true }).first()).toBeVisible();
});

test('critical public and authenticated pages have no automatic accessibility violations', async ({
    page,
}) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await page.goto('/docket');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await login(page, 'e2e_admin', '/dashboard');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.goto('/admin/reports?verdict=For%20Filing');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.goto('/admin/audit');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
