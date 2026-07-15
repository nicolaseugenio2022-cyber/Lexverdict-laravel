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

async function expectChartRendered(page: Page, testId: string) {
    const canvas = page.getByTestId(testId).locator('canvas');
    await expect(canvas).toBeVisible();
    await expect
        .poll(() =>
            canvas.evaluate((element) => {
                const chart = element as HTMLCanvasElement;
                const context = chart.getContext('2d');
                if (!context || chart.width === 0 || chart.height === 0) return false;
                return context
                    .getImageData(0, 0, chart.width, chart.height)
                    .data.some((value, index) => index % 4 === 3 && value > 0);
            }),
        )
        .toBe(true);
}

test('each staff role receives only its approved navigation and route access', async ({ page }) => {
    await login(page, 'e2e_admin', '/dashboard');
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reports' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Audit' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Resolution Review' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Verifying Cases' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Manage Crimes' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Subpoena Review' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
        'aria-current',
        'page',
    );
    await page.getByRole('link', { name: 'Manage Crimes' }).click();
    await expect(page).toHaveURL(/\/admin\/offenses$/);
    await expect(page.getByRole('link', { name: 'Manage Crimes' })).toHaveAttribute(
        'aria-current',
        'page',
    );
    const offenseName = `E2E Crime Catalog Entry ${Date.now()}`;
    await page.getByLabel('Crime Name').fill(offenseName);
    await page.getByLabel('Law Reference').fill('E2E Law Reference');
    await page.getByRole('button', { name: 'Add Crime' }).click();
    await expect(page.getByRole('cell', { name: offenseName, exact: true })).toBeVisible();
    await logout(page);

    let response;
    await login(page, 'e2e_prosecutor', '/subpoena-reviews');
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Subpoena Review' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reports' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Manage Crimes' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Verifying Cases' })).toHaveCount(0);
    response = await page.goto('/admin/offenses');
    expect(response?.status()).toBe(403);
    response = await page.goto('/admin/reports');
    expect(response?.status()).toBe(403);
    response = await page.goto('/dashboard');
    expect(response?.status()).toBe(403);
    await page.goto('/subpoena-reviews');
    await logout(page);

    await login(page, 'e2e_secretary', '/cases');
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Cases', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Subpoena Review' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Manage Crimes' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Verifying Cases' })).toBeVisible();
    await page.getByRole('link', { name: 'Verifying Cases' }).click();
    await expect(page).toHaveURL(/\/secretary\/verifying-cases/);
    await expect(page.getByRole('link', { name: 'Verifying Cases' })).toHaveAttribute(
        'aria-current',
        'page',
    );
    await expect(page.getByRole('link', { name: 'Subpoenas' })).toHaveAttribute(
        'aria-current',
        'page',
    );
    await expect(page.getByRole('cell', { name: 'Pending', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Resolutions' }).click();
    await expect(page.getByRole('link', { name: 'Resolutions' })).toHaveAttribute(
        'aria-current',
        'page',
    );
    await expect(page.getByRole('cell', { name: 'For Filing', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Approve|Deny/ })).toHaveCount(0);
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
    await expect(page.getByRole('link', { name: 'Manage Crimes' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Verifying Cases' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: /Docket Number/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Resolution Verdict/ })).toBeVisible();
    await expect(page.getByLabel('Search')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Apply' })).toBeVisible();
    const casesTable = page.getByRole('region', { name: 'Cases table' });
    await expect(casesTable).toBeVisible();
    expect(await casesTable.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
        true,
    );
    await casesTable.evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
    });
    await expect(page.getByRole('columnheader', { name: /Verdict Date/ })).toBeVisible();
    const approvedCaseRow = page.getByRole('row').filter({ hasText: 'RTC Cabanatuan' });
    await expect(approvedCaseRow.getByText('Qualified Theft', { exact: true })).toBeVisible();
    await expect(approvedCaseRow.getByText('For Filing', { exact: true })).toBeVisible();
    await expect(approvedCaseRow.getByText('RTC Cabanatuan', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View' })).toHaveCount(0);
    response = await page.goto('/dashboard');
    expect(response?.status()).toBe(403);
});

test('case entry supports keyboard crime search and cascading official addresses', async ({
    page,
}) => {
    await login(page, 'e2e_secretary', '/cases');
    await page.goto('/cases/create');

    const crimeSearch = page.getByLabel('Search Crime');
    await crimeSearch.fill('Qualified');
    await crimeSearch.press('ArrowDown');
    await crimeSearch.press('Enter');
    await expect(page.getByText('Selected Crimes (1)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Qualified Theft' })).toBeVisible();

    await crimeSearch.fill('Qualified');
    await expect(page.getByText('No matching Crime is available.')).toBeVisible();
    await crimeSearch.press('Escape');

    const region = page.getByLabel('Region').first();
    const province = page.getByLabel('Province').first();
    const municipality = page.getByLabel('Municipality/City').first();
    const barangay = page.getByLabel('Barangay').first();

    await region.selectOption('0300000000');
    await expect(province.getByRole('option', { name: 'Nueva Ecija' })).toBeAttached();
    await province.selectOption('0304900000');
    await expect(municipality.getByRole('option', { name: 'City of Cabanatuan' })).toBeAttached();
    await municipality.selectOption('0304903000');
    await expect(barangay.getByRole('option', { name: 'Dicarma' })).toBeAttached();
    await barangay.selectOption('0304903031');

    await region.selectOption('0700000000');
    await expect(province).toHaveValue('');
    await expect(municipality).toHaveValue('');
    await expect(barangay).toHaveValue('');

    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
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
    await expect.poll(() => new URL(page.url()).searchParams.get('verdict')).toBe('For Filing');
    await expect(page.getByRole('heading', { name: 'Case Summary' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Crime Distribution' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cases per Police Station' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sex Distribution' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Age Group Distribution' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Verdict Distribution' })).toBeVisible();
    for (const chart of [
        'chart-crime-distribution',
        'chart-cases-per-police-station',
        'chart-sex-distribution',
        'chart-age-group-distribution',
        'chart-verdict-distribution',
    ]) {
        await expectChartRendered(page, chart);
    }
    const summary = page.getByRole('region', { name: 'Case Summary' });
    await expect(summary.getByText('Total Cases')).toBeVisible();
    await expect(summary.locator('dl').filter({ hasText: 'Cases Filed' })).toContainText('1');
    await expect(summary.locator('dl').filter({ hasText: 'Cases Dismissed' })).toContainText('0');
    const verdictTable = page.getByRole('region', { name: 'Verdict Distribution tabular data' });
    await expect(
        verdictTable.getByRole('row').filter({ hasText: 'For Filing' }).getByRole('cell').nth(1),
    ).toHaveText('1');
    await expect(page.getByText('Qualified Theft', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Generate Report PDF' })).toHaveAttribute(
        'href',
        /verdict=For(?:\+|%20)Filing/,
    );
    await expect(page.getByRole('link', { name: 'Export CSV' })).toHaveAttribute(
        'href',
        /verdict=For(?:\+|%20)Filing/,
    );

    await page.getByLabel('Case Status').selectOption('Dismissed');
    await page.getByRole('button', { name: 'Generate' }).click();
    await expect(page).toHaveURL(/verdict=Dismissed/);
    await expect(summary.locator('dl').filter({ hasText: 'Total Cases' })).toContainText('0');
    await expect(summary.locator('dl').filter({ hasText: 'Cases Filed' })).toContainText('0');
    await expect(summary.locator('dl').filter({ hasText: 'Cases Dismissed' })).toContainText('0');
    await expect(
        verdictTable.getByRole('row').filter({ hasText: 'For Filing' }).getByRole('cell').nth(1),
    ).toHaveText('0');
    await expect(
        verdictTable.getByRole('row').filter({ hasText: 'Dismissed' }).getByRole('cell').nth(1),
    ).toHaveText('0');
});

test('critical public and authenticated pages have no automatic accessibility violations', async ({
    page,
}) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await page.goto('/docket');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await login(page, 'e2e_secretary', '/cases');
    await page.goto('/secretary/verifying-cases');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const verificationTable = page.getByRole('region', { name: 'Subpoena verification table' });
    expect(
        await verificationTable.evaluate((element) => element.scrollWidth > element.clientWidth),
    ).toBe(true);
    await logout(page);

    await login(page, 'e2e_admin', '/dashboard');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.goto('/admin/reports?verdict=For%20Filing');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expectChartRendered(page, 'chart-crime-distribution');
    await page.goto('/admin/audit');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    const auditTable = page.getByRole('region', { name: 'User Action Logs table' });
    expect(await auditTable.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
        true,
    );
    expect(
        await page.evaluate(() => {
            window.scrollTo({ left: document.documentElement.scrollWidth });
            return window.scrollX === 0;
        }),
    ).toBe(true);
    await auditTable.evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
    });
    expect(
        await page.evaluate(() => {
            window.scrollTo({ left: document.documentElement.scrollWidth });
            return window.scrollX === 0;
        }),
    ).toBe(true);
    await page.goto('/admin/offenses');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const crimeTable = page.getByRole('region', { name: 'Crime catalog table' });
    expect(await crimeTable.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
        true,
    );
});
