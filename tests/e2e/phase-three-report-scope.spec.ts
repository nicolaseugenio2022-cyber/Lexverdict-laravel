import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

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

test('Report Scope describes only effective filters and preserves native report navigation', async ({
    page,
}) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);
    await page.goto('/admin/reports');

    const scope = page.getByRole('region', { name: 'Report Scope' });
    const filterForm = page.locator('form.filter-panel');
    const dateFrom = filterForm.getByLabel('Date From');
    const dateTo = filterForm.getByLabel('Date To');
    const guidance = page.getByText(
        'Date filtering applies only when both Date From and Date To are provided.',
        { exact: true },
    );

    await expect(scope).toHaveCount(0);
    await expect(guidance).toBeVisible();
    await expect(dateFrom).toHaveAttribute('aria-describedby', 'report-date-guidance');
    await expect(dateTo).toHaveAttribute('aria-describedby', 'report-date-guidance');

    expect(
        await filterForm.evaluate((form) =>
            Array.from((form as HTMLFormElement).elements)
                .filter(
                    (element) =>
                        (element instanceof HTMLInputElement ||
                            element instanceof HTMLSelectElement ||
                            element instanceof HTMLButtonElement) &&
                        !(element instanceof HTMLInputElement && element.type === 'hidden'),
                )
                .map((element) => (element as HTMLInputElement | HTMLSelectElement).name),
        ),
    ).toEqual(['start_date', 'end_date', 'verdict', 'station', '', 'sex', 'age_group', '']);
    await dateFrom.focus();
    await expect(dateFrom).toBeFocused();

    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect(scope).toBeVisible();
    await expect(scope.getByText('All Records', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Generate Report PDF' })).toHaveAttribute(
        'href',
        '/admin/reports/pdf',
    );
    await expect(page.getByRole('link', { name: 'Export CSV' })).toHaveAttribute(
        'href',
        '/admin/reports/csv',
    );

    await dateFrom.fill('2026-07-01');
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('start_date')).toBe('2026-07-01');
    await expect(filterForm.getByLabel('Date From')).toHaveValue('2026-07-01');
    await expect(scope.getByText('All Records', { exact: true })).toBeVisible();
    await expect(scope.getByText('Date', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Generate Report PDF' })).toHaveAttribute(
        'href',
        '/admin/reports/pdf?start_date=2026-07-01',
    );

    await filterForm.getByLabel('Date To').fill('2026-07-31');
    await filterForm.getByLabel('Case Status').selectOption('For Filing');
    await filterForm.getByLabel('Police Station').selectOption('Cabanatuan City Police Station');
    const caseType = filterForm.getByLabel('Case Type');
    await caseType.fill('Qualified Theft');
    await page.getByRole('option', { name: 'Qualified Theft', exact: true }).click();
    const selectedOffenseId = await filterForm.locator('input[name="offenses[]"]').inputValue();
    await filterForm.getByLabel('Sex').selectOption('Female');
    await filterForm.getByLabel('Age Group').selectOption('31-45');
    await page.getByRole('button', { name: 'Generate', exact: true }).click();

    await expect
        .poll(() => {
            const url = new URL(page.url());

            return {
                keys: [...url.searchParams.keys()],
                startDate: url.searchParams.get('start_date'),
                endDate: url.searchParams.get('end_date'),
                verdict: url.searchParams.get('verdict'),
                station: url.searchParams.get('station'),
                offenses: url.searchParams.getAll('offenses[]'),
                sex: url.searchParams.get('sex'),
                ageGroup: url.searchParams.get('age_group'),
            };
        })
        .toEqual({
            keys: [
                'generate',
                'start_date',
                'end_date',
                'verdict',
                'station',
                'offenses[]',
                'sex',
                'age_group',
            ],
            startDate: '2026-07-01',
            endDate: '2026-07-31',
            verdict: 'For Filing',
            station: 'Cabanatuan City Police Station',
            offenses: [selectedOffenseId],
            sex: 'Female',
            ageGroup: '31-45',
        });

    await expect(scope.locator('dt')).toHaveText([
        'Date',
        'Case Status',
        'Case Type',
        'Police Station',
        'Sex',
        'Age Group',
    ]);
    await expect(scope.locator('dd')).toHaveText([
        '2026-07-01 to 2026-07-31',
        'Filed',
        'Qualified Theft',
        'Cabanatuan City Police Station',
        'Female',
        '31-45',
    ]);
    await expect(scope.getByText(selectedOffenseId, { exact: true })).toHaveCount(0);

    const combinedUrl = page.url();
    await page.getByRole('link', { name: 'Clear', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/reports$/);
    await expect(scope).toHaveCount(0);
    await expect(filterForm.getByLabel('Date From')).toHaveValue('');
    await page.goBack();
    await expect(page).toHaveURL(combinedUrl);
    await expect(scope.locator('dd')).toContainText(['2026-07-01 to 2026-07-31', 'Filed']);

    await page.emulateMedia({ media: 'print' });
    await expect(scope).toBeVisible();
    await expect(filterForm).toBeHidden();
    await page.emulateMedia({ media: 'screen' });

    await expectNoPageOverflow(page);
    await expectNoSeriousAccessibilityViolations(page);

    for (const viewport of [
        { width: 768, height: 1024 },
        { width: 375, height: 812 },
    ]) {
        await page.setViewportSize(viewport);
        await page.reload();
        await expect(scope).toBeVisible();
        await expectNoPageOverflow(page);
        await expectNoSeriousAccessibilityViolations(page);
    }
});
