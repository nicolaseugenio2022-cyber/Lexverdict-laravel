import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const password = 'E2E-only-password';

async function login(page: Page, username: string, landing: string) {
    await page.goto('/login');
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL((url) => url.pathname === landing);
}

async function logout(page: Page) {
    await page.getByRole('button', { name: 'Logout' }).click();
    await page.waitForURL((url) => url.pathname === '/login');
}

async function expectFlowingControlsWithStickyHeader(
    page: Page,
    regionName: string,
    headerName: string,
) {
    const region = page.getByRole('region', { name: regionName });
    const dataset = region.locator(
        'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " sticky-dataset ")][1]',
    );
    const controls = dataset.locator(':scope > .sticky-dataset-controls');
    const header = region.getByRole('columnheader', { name: headerName, exact: true }).first();

    await expect(dataset).toHaveAttribute('data-sticky-controls', 'false');
    await expect(controls).toHaveCSS('position', 'static');
    await expect(header).toHaveCSS('position', 'sticky');
    await expect
        .poll(() =>
            dataset.evaluate((element) => {
                const offset = Number.parseFloat(
                    window.getComputedStyle(element).getPropertyValue('--lv-sticky-table-offset'),
                );

                return !Number.isNaN(offset) && offset === 12;
            }),
        )
        .toBe(true);

    return { controls, dataset, header };
}

async function expectFlowingControlsScrollPastStickyHeader(
    page: Page,
    regionName: string,
    headerName: string,
) {
    const { controls, header } = await expectFlowingControlsWithStickyHeader(
        page,
        regionName,
        headerName,
    );
    const initialHeaderBox = await header.boundingBox();
    expect(initialHeaderBox).not.toBeNull();

    await header.evaluate((element) => {
        const absoluteHeaderTop = element.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: absoluteHeaderTop + 160, behavior: 'auto' });
    });

    await expect
        .poll(async () => {
            const headerBox = await header.boundingBox();
            return headerBox ? Math.abs(headerBox.y - 12) : Number.POSITIVE_INFINITY;
        })
        .toBeLessThanOrEqual(1);

    const controlsBox = await controls.boundingBox();
    const stickyHeaderBox = await header.boundingBox();
    expect(controlsBox).not.toBeNull();
    expect(stickyHeaderBox).not.toBeNull();
    expect(controlsBox!.y + controlsBox!.height).toBeLessThanOrEqual(0);
    expect(Math.abs(stickyHeaderBox!.x - initialHeaderBox!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(stickyHeaderBox!.width - initialHeaderBox!.width)).toBeLessThanOrEqual(1);
}

async function expectNoPageOverflow(page: Page) {
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
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

async function expectHeaderTextAlignment(plainHeader: Locator, sortableHeader: Locator) {
    const plainTextOffset = await plainHeader.evaluate((element) => {
        const styles = window.getComputedStyle(element);
        return Number.parseFloat(styles.paddingLeft);
    });
    const sortableTextOffset = await sortableHeader.evaluate((header) => {
        const button = header.querySelector('button');
        if (!button) return Number.NaN;

        const buttonStyles = window.getComputedStyle(button);
        return (
            button.getBoundingClientRect().x -
            header.getBoundingClientRect().x +
            Number.parseFloat(buttonStyles.paddingLeft)
        );
    });

    expect(Math.abs(sortableTextOffset - plainTextOffset)).toBeLessThanOrEqual(1);
}

async function ensureScrollableCrimeCatalog(page: Page) {
    const rows = page.getByRole('region', { name: 'Crime catalog table' }).locator('tbody tr');
    const initialCount = await rows.count();

    for (let index = initialCount; index < 10; index += 1) {
        await page.getByLabel('Crime Name').fill(`Sticky Layout Test Crime ${index}`);
        await page.getByLabel('Law Reference').fill(`Test Reference ${index}`);
        await page.getByRole('button', { name: 'Add Crime', exact: true }).click();
        await expect(rows).toHaveCount(index + 1);
    }
}

test('Administrator datasets use responsive sticky presentation without owning URL state', async ({
    page,
}) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, 'e2e_admin', '/dashboard');

    const metrics = page.getByRole('region', { name: 'Primary Operational Metrics' });
    expect(await metrics.locator('dt').allTextContents()).toEqual([
        'Total Cases',
        'Cases Ready for Filing',
        'Active Users',
        'Active Crimes',
    ]);
    await expect(metrics.locator('dt').first()).toHaveClass(/primary-metric-label/);
    await expect(metrics.locator('dd').first()).toHaveClass(/primary-metric-value/);

    await page.setViewportSize({ width: 1440, height: 600 });
    await page.goto('/admin/offenses');
    await ensureScrollableCrimeCatalog(page);
    const controls = page.locator('.sticky-dataset-controls');
    const firstHeader = page.getByRole('columnheader', { name: 'Crime', exact: true });
    await expect(controls).toHaveCSS('position', 'static');
    await expect(firstHeader).toHaveCSS('position', 'sticky');
    await expectFlowingControlsScrollPastStickyHeader(page, 'Crime catalog table', 'Crime');

    const rows = page.getByRole('region', { name: 'Crime catalog table' }).locator('tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
    expect(await rows.count()).toBeLessThanOrEqual(10);

    await page.getByLabel('Search', { exact: true }).fill('Theft');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page).toHaveURL(/\/admin\/offenses\?search=Theft$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/admin\/offenses$/);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/users');
    const userBadge = page.locator('.status-badge').first();
    await expect(userBadge).toBeVisible();
    expect((await userBadge.boundingBox())?.height).toBeGreaterThanOrEqual(24);
    const rowColors = await page
        .getByRole('region', { name: 'Users table' })
        .locator('tbody tr')
        .evaluateAll((elements) =>
            elements.slice(0, 2).map((element) => window.getComputedStyle(element).backgroundColor),
        );
    expect(rowColors).toHaveLength(2);
    expect(rowColors[0]).not.toBe(rowColors[1]);

    await expectNoPageOverflow(page);
    await expectNoSeriousAccessibilityViolations(page);

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/admin/offenses');
    await expect(page.locator('.sticky-dataset-controls')).toHaveCSS('position', 'static');
    await expect(page.getByRole('columnheader', { name: 'Crime', exact: true })).toHaveCSS(
        'position',
        'static',
    );
    await expectNoPageOverflow(page);

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin/offenses');
    await expect(page.locator('.sticky-dataset-controls')).toHaveCSS('position', 'static');
    await expectNoPageOverflow(page);
});

test('Shared StickyDataset preserves sticky headers beneath flowing controls', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, 'e2e_admin', '/dashboard');

    await page.goto('/cases');
    await expectFlowingControlsWithStickyHeader(page, 'Cases table', 'Case');

    await page.goto('/resolution-reviews');
    await expectFlowingControlsWithStickyHeader(page, 'Resolution Review table', 'Case');

    await page.goto('/admin/audit');
    await expect(page.locator('.sticky-dataset')).toHaveAttribute('data-sticky-controls', 'true');
    await expect(page.locator('.sticky-dataset-controls')).toHaveCSS('position', 'sticky');
    await expect
        .poll(() =>
            page.locator('.sticky-dataset').evaluate((element) => {
                const controlsElement = element.querySelector<HTMLElement>(
                    ':scope > .sticky-dataset-controls',
                );
                const offset = Number.parseFloat(
                    window.getComputedStyle(element).getPropertyValue('--lv-sticky-table-offset'),
                );

                return controlsElement
                    ? offset === Math.ceil(controlsElement.getBoundingClientRect().height) + 12
                    : false;
            }),
        )
        .toBe(true);
    await expect(page.locator('.sticky-dataset .sticky-table-header')).toHaveCount(0);

    await logout(page);
    await login(page, 'e2e_prosecutor', '/subpoena-reviews');
    await expectFlowingControlsWithStickyHeader(page, 'Subpoena Review table', 'Case');

    await logout(page);
    await login(page, 'e2e_secretary', '/cases');
    await page.goto('/secretary/verifying-cases');
    await expectFlowingControlsWithStickyHeader(page, 'Subpoena verification table', 'Case');
    await expectFlowingControlsWithStickyHeader(page, 'Resolution verification table', 'Case');
});

test('Reports and Process Server retain their approved sticky-header exclusions', async ({
    page,
}) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, 'e2e_admin', '/dashboard');
    await page.goto('/admin/reports');

    await expect(page.locator('form.filter-panel')).toHaveCSS('position', 'static');
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Case Summary' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Category' }).first()).toHaveCSS(
        'position',
        'sticky',
    );
    await expectNoPageOverflow(page);

    await logout(page);
    await login(page, 'e2e_process_server', '/process-server/cases');
    await expect(page.locator('.sticky-dataset-controls')).toHaveCSS('position', 'static');
    await expect(page.getByRole('columnheader', { name: 'Case', exact: true })).toHaveCSS(
        'position',
        'static',
    );
    await expectNoPageOverflow(page);
    await expectNoSeriousAccessibilityViolations(page);
});

test('Review queue tables align sortable headers and Subpoena party metadata', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, 'e2e_prosecutor', '/subpoena-reviews');

    const subpoenaTable = page.getByRole('region', { name: 'Subpoena Review table' });
    const subpoenaCaseHeader = subpoenaTable.getByRole('columnheader', {
        name: /^Case(?: \(sorted\))?$/,
    });
    const subpoenaPartiesHeader = subpoenaTable.getByRole('columnheader', {
        name: 'Parties',
        exact: true,
    });
    await expectHeaderTextAlignment(subpoenaPartiesHeader, subpoenaCaseHeader);

    const partyParagraphs = subpoenaTable
        .locator('tbody tr')
        .first()
        .locator('td')
        .nth(2)
        .locator('p');
    await expect(partyParagraphs).toHaveCount(2);
    const metadataGap = await partyParagraphs.evaluateAll(
        (paragraphs) =>
            paragraphs[1].getBoundingClientRect().top -
            paragraphs[0].getBoundingClientRect().bottom,
    );
    expect(Math.abs(metadataGap - 6)).toBeLessThanOrEqual(0.5);

    await subpoenaTable.getByRole('button', { name: /^Date/ }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('date');
    await expect(subpoenaCaseHeader).toHaveCSS('position', 'sticky');
    await expectNoPageOverflow(page);
    await expectNoSeriousAccessibilityViolations(page);

    await logout(page);
    await login(page, 'e2e_admin', '/dashboard');
    await page.goto('/resolution-reviews');

    const resolutionTable = page.getByRole('region', { name: 'Resolution Review table' });
    const resolutionCaseHeader = resolutionTable.getByRole('columnheader', {
        name: 'Case',
        exact: true,
    });
    const resolutionVerdictHeader = resolutionTable.getByRole('columnheader', {
        name: /^Verdict(?: \(sorted\))?$/,
    });
    await expectHeaderTextAlignment(resolutionCaseHeader, resolutionVerdictHeader);
    await resolutionVerdictHeader.getByRole('button').focus();
    await expect(resolutionVerdictHeader.getByRole('button')).toBeFocused();
    await resolutionVerdictHeader.getByRole('button').press('Enter');
    await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('verdict');
    await expect(resolutionCaseHeader).toHaveCSS('position', 'sticky');

    await page.setViewportSize({ width: 375, height: 812 });
    await expectNoPageOverflow(page);
    await expectNoSeriousAccessibilityViolations(page);
});
