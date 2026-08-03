import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const password = 'E2E-only-password';

async function login(page: Page) {
    await page.goto('/login');
    await page.getByLabel('Username').fill('e2e_admin');
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL((url) => url.pathname === '/dashboard');
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
    await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);
}

async function exportOffenseIds(link: Locator) {
    const href = await link.getAttribute('href');
    expect(href).not.toBeNull();
    const url = new URL(href ?? '', 'http://127.0.0.1:8008');

    return [...url.searchParams.entries()]
        .filter(([key]) => /^offenses\[\d+]$/.test(key))
        .map(([, value]) => value);
}

test('Case Type search preserves canonical catalog-ordered report filters', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);

    const temporaryName = `AAA Phase 3.2B Offense ${Date.now()}`;
    await page.goto('/admin/offenses');
    await page.getByLabel('Crime Name').fill(temporaryName);
    await page.getByRole('button', { name: 'Add Crime' }).click();
    await expect(page.getByRole('row').filter({ hasText: temporaryName })).toBeVisible();

    await page.goto('/admin/reports');
    const filterForm = page.locator('form.filter-panel');
    const caseType = filterForm.getByRole('combobox', { name: 'Case Type' });
    const hiddenSelections = filterForm.locator('input[type="hidden"][name="offenses[]"]');

    await expect(caseType).not.toHaveAttribute('name');
    await caseType.focus();
    const resultListbox = page.getByRole('listbox', { name: 'Case Type catalog results' });
    await expect(resultListbox).toBeVisible();
    expect(await page.getByRole('option').count()).toBeLessThanOrEqual(20);

    await caseType.fill('No Case Type Matches This Search');
    await expect(
        resultListbox.getByText('No matching Case Type is available.', { exact: true }),
    ).toBeVisible();
    await caseType.press('Escape');
    await expect(caseType).toHaveValue('');
    await expect(page.getByRole('listbox', { name: 'Case Type catalog results' })).toHaveCount(0);

    await caseType.fill('Qualified Theft');
    await caseType.press('ArrowDown');
    await caseType.press('Enter');
    await expect(page.getByText('Selected Case Types (1)', { exact: true })).toBeVisible();
    await expect(caseType).toBeFocused();
    await expect(resultListbox).toHaveCount(0);

    await page.getByRole('button', { name: 'Remove Qualified Theft' }).click();
    await expect(hiddenSelections).toHaveCount(0);
    await expect(caseType).toBeFocused();

    await caseType.fill('Qualified Theft');
    await expect(resultListbox).toBeVisible();
    await caseType.press('ArrowDown');
    await caseType.press('Enter');
    await expect(resultListbox).toHaveCount(0);

    await caseType.fill(temporaryName);
    await page.getByRole('option', { name: temporaryName, exact: true }).click();
    await expect(page.getByText('Selected Case Types (2)', { exact: true })).toBeVisible();
    await expect(caseType).toBeFocused();
    await expect(resultListbox).toHaveCount(0);

    const selectedNames = page.locator('ul').filter({ hasText: 'Qualified Theft' }).locator('li');
    await expect(selectedNames).toContainText([temporaryName, 'Qualified Theft']);
    const orderedIds = await hiddenSelections.evaluateAll((inputs) =>
        inputs.map((input) => (input as HTMLInputElement).value),
    );
    expect(orderedIds).toHaveLength(2);

    await caseType.fill('Qualified Theft');
    await expect(
        resultListbox.getByText('No matching Case Type is available.', { exact: true }),
    ).toBeVisible();
    await expect(hiddenSelections).toHaveCount(2);
    await caseType.press('Escape');

    await page.getByRole('button', { name: `Remove ${temporaryName}` }).click();
    await caseType.fill(temporaryName);
    await expect(resultListbox).toBeVisible();
    await page.getByRole('option', { name: temporaryName, exact: true }).click();
    await expect(resultListbox).toHaveCount(0);

    const submittedEntries = await filterForm.evaluate((form) =>
        [...new FormData(form as HTMLFormElement).entries()].map(([key, value]) => [
            key,
            String(value),
        ]),
    );
    expect(
        submittedEntries.filter(([key]) => key === 'offenses[]').map(([, value]) => value),
    ).toEqual(orderedIds);
    expect(submittedEntries.some(([key]) => key.toLowerCase().includes('search'))).toBe(false);

    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect
        .poll(() => new URL(page.url()).searchParams.getAll('offenses[]'))
        .toEqual(orderedIds);

    const reportScope = page.getByRole('region', { name: 'Report Scope' });
    await expect(reportScope).toContainText(temporaryName);
    await expect(reportScope).toContainText('Qualified Theft');
    for (const offenseId of orderedIds) {
        await expect(reportScope.getByText(offenseId, { exact: true })).toHaveCount(0);
    }

    const pdfExport = page.getByRole('link', { name: 'Generate Report PDF' });
    const csvExport = page.getByRole('link', { name: 'Export CSV' });
    expect(await exportOffenseIds(pdfExport)).toEqual(orderedIds);
    expect(await exportOffenseIds(csvExport)).toEqual(orderedIds);

    await page.getByRole('button', { name: `Remove ${temporaryName}` }).click();
    await expect(caseType).toBeFocused();
    await expect(hiddenSelections).toHaveCount(1);
    await expect(reportScope).toContainText(temporaryName);
    expect(await exportOffenseIds(pdfExport)).toEqual(orderedIds);
    expect(await exportOffenseIds(csvExport)).toEqual(orderedIds);

    const submittedUrl = page.url();
    await page.getByRole('link', { name: 'Clear', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/reports$/);
    await expect(hiddenSelections).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(submittedUrl);
    await expect(hiddenSelections).toHaveCount(2);
    await expect
        .poll(() =>
            hiddenSelections.evaluateAll((inputs) =>
                inputs.map((input) => (input as HTMLInputElement).value),
            ),
        )
        .toEqual(orderedIds);

    await expectNoPageOverflow(page);
    await expectNoSeriousAccessibilityViolations(page);

    for (const viewport of [
        { width: 768, height: 1024 },
        { width: 375, height: 812 },
    ]) {
        await page.setViewportSize(viewport);
        await page.reload();
        await expect(hiddenSelections).toHaveCount(2);
        await expectNoPageOverflow(page);
        await expectNoSeriousAccessibilityViolations(page);
    }

    await page.goto(`/admin/offenses?search=${encodeURIComponent(temporaryName)}`);
    const offenseRow = page.getByRole('row').filter({ hasText: temporaryName });
    await offenseRow.getByRole('button', { name: 'Delete' }).click();
    const deleteDialog = page.getByRole('alertdialog', { name: 'Delete Crime' });
    await deleteDialog.getByRole('button', { name: 'Delete Crime' }).click();
    await expect(offenseRow).toHaveCount(0);
});
