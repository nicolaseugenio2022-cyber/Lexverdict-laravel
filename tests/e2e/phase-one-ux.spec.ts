import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Dialog, type Page } from '@playwright/test';

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

test('empty states and unsaved Case changes preserve authorized navigation', async ({ page }) => {
    await login(page, 'e2e_secretary', '/cases');

    await page.goto('/cases?search=NoPhaseOneCaseMatches');
    const casesTable = page.getByRole('region', { name: 'Cases table' });
    await expect(casesTable.getByText('No cases match the current filters.')).toBeVisible();
    const clearFilters = casesTable.getByRole('link', { name: 'Clear filters' });
    await expect(clearFilters).toHaveAttribute('href', '/cases');
    await expectNoSeriousAccessibilityViolations(page);

    await clearFilters.click();
    await expect(page).toHaveURL(/\/cases$/);
    await page.goto('/cases/create');

    const casesLink = page.getByRole('link', { name: 'Cases', exact: true });
    await casesLink.click();
    await expect(page).toHaveURL(/\/cases$/);

    await page.goto('/cases/create');
    await page.getByLabel('Date', { exact: true }).fill('2026-07-28');

    let warningMessage = '';
    page.once('dialog', async (warning) => {
        warningMessage = warning.message();
        await warning.dismiss();
    });
    await page.getByRole('link', { name: 'Cases', exact: true }).click();
    expect(warningMessage).toContain('unsaved changes');
    await expect(page).toHaveURL(/\/cases\/create$/);

    page.once('dialog', (warning) => warning.accept());
    await page.getByRole('link', { name: 'Cases', exact: true }).click();
    await expect(page).toHaveURL(/\/cases$/);
});

test('validation failures reactivate unsaved-change protection after submission bypass', async ({
    page,
}) => {
    await login(page, 'e2e_admin', '/dashboard');
    await page.goto('/admin/users/create');
    await page.getByLabel('Username').fill(`phase_one_invalid_${Date.now()}`);

    let submissionDialogs = 0;
    const submissionDialogHandler = async (dialog: Dialog) => {
        submissionDialogs += 1;
        await dialog.dismiss();
    };
    page.on('dialog', submissionDialogHandler);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('.field-error').first()).toBeVisible();
    expect(submissionDialogs).toBe(0);
    page.off('dialog', submissionDialogHandler);

    const unloadPrevented = await page.evaluate(() => {
        const event = new Event('beforeunload', { cancelable: true });
        return !window.dispatchEvent(event);
    });
    expect(unloadPrevented).toBe(true);
    await expect(page).toHaveURL(/\/admin\/users\/create$/);

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('link', { name: 'Cases', exact: true }).click();
    await expect(page).toHaveURL(/\/cases$/);
});

test('Crime feedback and destructive confirmation are accessible and single-submit', async ({
    page,
}) => {
    await login(page, 'e2e_admin', '/dashboard');
    await page.goto('/admin/offenses');

    const offenseName = `Phase One UX Crime ${Date.now()}`;
    await page.getByLabel('Crime Name').fill(offenseName);
    await page.getByLabel('Law Reference').fill('Phase One UX Reference');
    await page.getByRole('button', { name: 'Add Crime' }).click();

    const offenseRow = page.getByRole('row').filter({ hasText: offenseName });
    await expect(offenseRow).toBeVisible();
    await expect(page.getByText('Crime added.', { exact: true })).toBeVisible();

    const deleteButton = offenseRow.getByRole('button', { name: 'Delete' });
    await deleteButton.click();
    const dialog = page.getByRole('alertdialog', { name: 'Delete Crime' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await expectNoSeriousAccessibilityViolations(page);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(deleteButton).toBeFocused();

    let deleteRequests = 0;
    page.on('request', (request) => {
        if (request.method() === 'DELETE' && request.url().includes('/admin/offenses/')) {
            deleteRequests += 1;
        }
    });

    await deleteButton.click();
    await dialog.getByRole('button', { name: 'Delete Crime' }).click();
    await expect(offenseRow).toHaveCount(0);
    await expect(page.getByText('Crime deleted.', { exact: true })).toBeVisible();
    expect(deleteRequests).toBe(1);

    await page.getByRole('button', { name: 'Dismiss success notification' }).last().click();
    await expect(page.getByText('Crime deleted.', { exact: true })).toHaveCount(0);
});

test('Administrator Case Report keeps content and branding in print media', async ({ page }) => {
    await login(page, 'e2e_admin', '/dashboard');
    await page.goto('/admin/reports');
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Case Summary' })).toBeVisible();

    await page.emulateMedia({ media: 'print' });

    const seal = page.getByRole('img', { name: 'Department of Justice seal' });
    await expect(seal).toBeVisible();
    await expect(seal).toHaveCSS('width', '40px');
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Case Summary' })).toBeVisible();

    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
});
