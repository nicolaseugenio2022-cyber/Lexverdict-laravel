import { expect, test, type Page } from '@playwright/test';

const password = 'E2E-only-password';
const screenshotOptions = {
    animations: 'disabled' as const,
    caret: 'hide' as const,
    scale: 'css' as const,
    threshold: 0.2,
    maxDiffPixelRatio: 0.001,
};

test.use({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'Asia/Manila',
    deviceScaleFactor: 1,
    contextOptions: { reducedMotion: 'reduce' },
});

test.skip(
    process.platform !== 'linux',
    'Reports visual baselines are authoritative only in the CI Linux Chromium environment.',
);

async function login(page: Page) {
    await page.goto('/login');
    await page.getByLabel('Username').fill('e2e_admin');
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL((url) => url.pathname === '/dashboard');
}

async function waitForStableReportsPage(page: Page) {
    await expect(page.locator('#main-content')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
}

test('Reports page preserves its default and selected Case Type presentation', async ({ page }) => {
    await login(page);
    await page.goto('/admin/reports');
    await waitForStableReportsPage(page);

    const mainContent = page.locator('#main-content');
    await expect(page.getByRole('region', { name: 'Report Scope' })).toHaveCount(0);
    await expect(mainContent).toHaveScreenshot('reports-default.png', screenshotOptions);

    const caseType = page.getByRole('combobox', { name: 'Case Type' });
    await caseType.fill('Qualified Theft');
    await page.getByRole('option', { name: 'Qualified Theft', exact: true }).click();

    await expect(caseType).toHaveValue('');
    await expect(caseType).toBeFocused();
    await expect(page.getByRole('listbox', { name: 'Case Type catalog results' })).toHaveCount(0);
    await expect(page.locator('input[type="hidden"][name="offenses[]"]')).toHaveCount(1);
    await expect(page.getByText('Selected Case Types (1)', { exact: true })).toBeVisible();
    await expect(page.getByText('Qualified Theft', { exact: true })).toBeVisible();
    await waitForStableReportsPage(page);

    await expect(mainContent).toHaveScreenshot('reports-case-type-selected.png', screenshotOptions);
});
