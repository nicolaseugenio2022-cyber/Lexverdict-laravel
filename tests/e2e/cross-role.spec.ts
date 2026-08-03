import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const password = 'E2E-only-password';
const execFileAsync = promisify(execFile);

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

async function expectAdministratorPresentation(page: Page) {
    await expect(page.locator('main .page-header')).toBeVisible();
    await expect(page.locator('main .page-stack')).toBeVisible();
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(
        await page.locator('main').evaluate(
            (main) =>
                Array.from(main.querySelectorAll<HTMLElement>('*')).filter((element) => {
                    const style = window.getComputedStyle(element);
                    const scrollsVertically = ['auto', 'scroll'].includes(style.overflowY);

                    return scrollsVertically && element.scrollHeight > element.clientHeight + 1;
                }).length,
        ),
    ).toBe(0);
}

async function expectRoleCaseList(
    page: Page,
    role: 'standard' | 'prosecutor' | 'processServer' = 'standard',
) {
    const casesTable = page.getByRole('region', { name: 'Cases table' });
    const prosecutor = role === 'prosecutor';

    if (role === 'standard') {
        for (const heading of ['Case', 'Parties', 'Assignment', 'Resolution']) {
            await expect(
                casesTable.getByRole('columnheader', { name: heading, exact: true }),
            ).toBeVisible();
        }
        for (const label of [
            'Complainant:',
            'Respondent:',
            'Police Station:',
            'Date:',
            'Prosecutor:',
            'Court:',
            'Date Filed:',
        ]) {
            await expect(casesTable.getByText(label, { exact: true }).first()).toBeVisible();
        }
    } else {
        const headings = prosecutor
            ? ['Case', 'Complainant', 'Respondent', 'Date', 'Verdict']
            : [
                  'Case',
                  'Complainant',
                  'Respondent',
                  'Police Station',
                  'Date',
                  'Assigned Prosecutor',
                  'Resolution Verdict',
                  'Court',
                  'Verdict Date',
              ];

        for (const heading of headings) {
            await expect(
                casesTable.getByRole('columnheader', { name: heading, exact: true }),
            ).toBeVisible();
        }
    }

    for (const removedHeading of ['Docket No.', 'Docket Number', 'Crime/Case']) {
        await expect(
            casesTable.getByRole('columnheader', { name: removedHeading, exact: true }),
        ).toHaveCount(0);
    }

    await expect(page.getByLabel('Sort by')).toBeVisible();
    await expect(page.getByLabel('Order')).toBeVisible();
    await expect(page.getByLabel('Search', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Search field')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
}

test('each staff role receives only its approved navigation and route access', async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    const loginLogo = page.getByRole('img', { name: 'Department of Justice seal' });
    await expect(loginLogo).toBeVisible();
    await expect(loginLogo).toHaveAttribute('src', '/images/branding/doj-seal.png');
    await expect(loginLogo).toHaveCSS('width', '44px');
    await expect(loginLogo).toHaveCSS('height', '44px');
    await expect(loginLogo).toHaveCount(1);
    await expect(page.getByText('LV', { exact: true })).toHaveCount(0);
    await page.getByLabel('Username').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Password')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Login' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Case Lookup' })).toBeFocused();
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByLabel('Username')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Username')).toHaveAttribute('aria-describedby', 'username-error');
    await expect(page.getByLabel('Password')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Password')).toHaveAttribute('aria-describedby', 'password-error');
    await expect(page.locator('#username-error')).toBeVisible();
    await expect(page.locator('#password-error')).toBeVisible();
    await page.getByRole('link', { name: 'Case Lookup' }).click();
    await expect(page).toHaveURL(/\/docket$/);
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');
    await expect(page.getByRole('img', { name: 'Department of Justice seal' })).toHaveCSS(
        'height',
        '44px',
    );
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, 'e2e_admin', '/dashboard');
    const brandLogo = page.getByRole('img', { name: 'Department of Justice seal' });
    await expect(brandLogo).toBeVisible();
    expect(
        await brandLogo.evaluate((element) => {
            const image = element as HTMLImageElement;
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const context = canvas.getContext('2d');
            context?.drawImage(image, 0, 0, 1, 1, 0, 0, 1, 1);

            return {
                naturalWidth: image.naturalWidth,
                naturalHeight: image.naturalHeight,
                renderedHeight: image.getBoundingClientRect().height,
                cornerAlpha: context?.getImageData(0, 0, 1, 1).data[3],
            };
        }),
    ).toEqual({
        naturalWidth: 1024,
        naturalHeight: 1024,
        renderedHeight: 40,
        cornerAlpha: 0,
    });
    await expect(page.getByRole('heading', { name: 'Operational Dashboard' })).toBeVisible();
    const primaryMetrics = page.getByRole('region', { name: 'Primary Operational Metrics' });
    await expect(primaryMetrics).toBeVisible();
    expect(await primaryMetrics.locator('dt').allTextContents()).toEqual([
        'Total Cases',
        'Cases Ready for Filing',
        'Active Users',
        'Active Crimes',
    ]);
    await expect(page.getByRole('heading', { name: 'Office Overview' })).toBeVisible();
    await expect(page.getByText('Pending Subpoenas', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent Activity' })).toBeVisible();
    await expect(page.getByText('New Case Registered', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'View All Activity' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Quick Actions' })).toHaveCount(0);
    const recentActivity = page.getByRole('list', { name: 'Recent audit activity' });
    const firstActivity = recentActivity.getByRole('link').first();
    await expect(recentActivity.getByRole('link')).toHaveCount(5);
    const firstActivityTimestamp = firstActivity.locator('time');
    await expect(firstActivityTimestamp.locator('span').first()).toHaveText('Today');
    await expect(firstActivityTimestamp.locator('span').nth(1)).toHaveText(
        /^\d{1,2}:\d{2} (AM|PM)$/,
    );
    await expect(firstActivityTimestamp).toHaveAttribute(
        'datetime',
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/,
    );
    await expect(firstActivityTimestamp).toHaveAttribute(
        'title',
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
    );
    const timestampBox = await firstActivityTimestamp.boundingBox();
    expect(timestampBox).not.toBeNull();
    expect(timestampBox?.width ?? 0).toBeGreaterThanOrEqual(96);
    expect(timestampBox?.width ?? 0).toBeLessThanOrEqual(101);
    await expect(firstActivity.locator('strong')).toContainText(/^III-09-INV-/);
    await expect(recentActivity.getByRole('button', { name: 'Details' })).toHaveCount(0);
    await expect(firstActivity).toHaveAttribute('href', /^\/admin\/audit\/[0-9a-f-]+$/);
    const activityHref = await firstActivity.getAttribute('href');
    await firstActivity.focus();
    await expect(firstActivity).toBeFocused();
    await firstActivity.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${activityHref}$`));
    await expect(page.getByText('Technical identifiers', { exact: true })).toBeVisible();
    await expect(page.getByText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Operational Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: /^View Pending Resolutions:/ })).toHaveAttribute(
        'href',
        '/resolution-reviews',
    );
    expect(
        await page.locator('main').evaluate((main) => main.querySelector('a a, a button') === null),
    ).toBe(true);
    for (const panelName of [
        'Primary Operational Metrics',
        'Recent Activity',
        'Office Overview',
        'Pending Work',
    ]) {
        const panelBox = await page.getByRole('region', { name: panelName }).boundingBox();
        expect(panelBox).not.toBeNull();
        expect((panelBox?.y ?? 0) + (panelBox?.height ?? 0)).toBeLessThanOrEqual(900);
    }
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole('region', { name: 'Recent Activity' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Office Overview' })).toBeVisible();
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.setViewportSize({ width: 1440, height: 900 });
    const administratorNavigation = page.getByRole('navigation', { name: 'Staff navigation' });
    await expect(administratorNavigation.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(administratorNavigation.getByRole('link', { name: 'Reports' })).toBeVisible();
    await expect(administratorNavigation.getByRole('link', { name: 'Audit' })).toBeVisible();
    await expect(
        administratorNavigation.getByRole('link', { name: 'Resolution Review' }),
    ).toBeVisible();
    await expect(
        administratorNavigation.getByRole('link', { name: 'Verifying Cases' }),
    ).toHaveCount(0);
    await expect(
        administratorNavigation.getByRole('link', { name: 'Manage Crimes' }),
    ).toBeVisible();
    await expect(
        administratorNavigation.getByRole('link', { name: 'Subpoena Review' }),
    ).toHaveCount(0);
    await expect(administratorNavigation.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
        'aria-current',
        'page',
    );
    await page.goto('/admin/assignments');
    const assignForm = page
        .getByRole('heading', { name: 'Assign Prosecutor and Secretary' })
        .locator('..');
    const swapForm = page.getByRole('heading', { name: 'Swap Assignments' }).locator('..');
    const assignmentTime = page
        .getByRole('region', { name: 'Assignments table' })
        .locator('time')
        .first();
    await expect(assignmentTime).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}T/);
    await expect(assignmentTime).toHaveAttribute('title', /^\d{4}-\d{2}-\d{2}T/);
    let assignBox = await assignForm.boundingBox();
    let swapBox = await swapForm.boundingBox();
    expect(assignBox).not.toBeNull();
    expect(swapBox).not.toBeNull();
    expect(Math.abs((assignBox?.y ?? 0) - (swapBox?.y ?? 0))).toBeLessThan(2);
    expect(assignBox?.x ?? 0).toBeLessThan(swapBox?.x ?? 0);
    await page.setViewportSize({ width: 768, height: 1024 });
    assignBox = await assignForm.boundingBox();
    swapBox = await swapForm.boundingBox();
    expect(swapBox?.y ?? 0).toBeGreaterThan((assignBox?.y ?? 0) + (assignBox?.height ?? 0));
    await page.setViewportSize({ width: 375, height: 812 });
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    await page.getByRole('link', { name: 'Cases', exact: true }).click();
    await expectRoleCaseList(page);
    await expect(page.getByRole('columnheader', { name: 'Command', exact: true })).toBeVisible();
    const administratorCasesTable = page.getByRole('region', { name: 'Cases table' });
    expect(
        await administratorCasesTable.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
        ),
    ).toBe(true);
    const administratorGeneratePdf = administratorCasesTable
        .getByRole('button', { name: 'Generate PDF' })
        .first();
    await expect(administratorGeneratePdf).toHaveClass(/btn-secondary/);
    await expect(administratorGeneratePdf).toHaveClass(/btn-compact/);
    await expect(administratorGeneratePdf).toHaveCSS('min-height', '36px');
    expect(
        await administratorGeneratePdf.locator('xpath=parent::*').evaluate((group) => {
            const style = window.getComputedStyle(group);

            return [style.display, style.flexWrap, style.gap];
        }),
    ).toEqual(['flex', 'wrap', '8px']);
    const administratorCommandRow = administratorGeneratePdf.locator('xpath=ancestor::tr');
    await administratorCommandRow.getByRole('link', { name: /^Open case / }).focus();
    await page.keyboard.press('Tab');
    await expect(administratorGeneratePdf).toBeFocused();
    await expect(administratorGeneratePdf).toHaveCSS('outline-style', 'solid');
    const resolvedState = administratorCasesTable.getByText('Resolved', { exact: true }).first();
    await expect(resolvedState).toBeVisible();
    expect(await resolvedState.evaluate((element) => element.closest('a, button') === null)).toBe(
        true,
    );
    await expect(
        administratorCasesTable.getByText('Date Filed:', { exact: true }).first(),
    ).toBeVisible();
    await expect(
        administratorCasesTable.getByRole('link', { name: 'View', exact: true }),
    ).toHaveCount(0);
    const administratorRow = administratorCasesTable.locator('tbody tr').first();
    const administratorRowLink = administratorRow.getByRole('link', { name: /^Open case / });
    const administratorCaseHref = await administratorRowLink.getAttribute('href');
    if (!administratorCaseHref)
        throw new Error('Administrator Case row is missing its destination.');
    const administratorCaseCell = await administratorRow.locator('td').nth(1).boundingBox();
    if (!administratorCaseCell)
        throw new Error('Administrator Case row is not available for pointer navigation.');
    await page.mouse.click(
        administratorCaseCell.x + administratorCaseCell.width / 2,
        administratorCaseCell.y + administratorCaseCell.height / 2,
    );
    await page.waitForURL((url) => `${url.pathname}${url.search}` === administratorCaseHref);
    await page.goBack();
    await page.goto('/resolution-reviews');
    const resolutionReviewTable = page.getByRole('region', { name: 'Resolution Review table' });
    await expect(resolutionReviewTable).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Action', exact: true })).toHaveCount(0);
    expect(
        await resolutionReviewTable.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
        ),
    ).toBe(true);
    await page.goto('/admin/users');
    await expect(page.getByRole('link', { name: 'Edit', exact: true }).first()).toHaveClass(
        /btn-compact/,
    );
    await expect(page.getByRole('button', { name: 'Deactivate' }).first()).toHaveClass(
        /btn-danger-outline/,
    );
    await page.getByRole('link', { name: 'Manage Crimes' }).click();
    await expect(page).toHaveURL(/\/admin\/offenses$/);
    await expect(page.getByRole('link', { name: 'Manage Crimes' })).toHaveAttribute(
        'aria-current',
        'page',
    );
    await expect(page.getByText(/^Showing 1 to \d+ of \d+ crimes\.$/)).toBeVisible();
    expect(
        await page.getByRole('region', { name: 'Crime catalog table' }).locator('tbody tr').count(),
    ).toBeLessThanOrEqual(10);
    const offenseName = `E2E Crime Catalog Entry ${Date.now()}`;
    await page.getByLabel('Crime Name').fill(offenseName);
    await page.getByLabel('Law Reference').fill('E2E Law Reference');
    await page.getByRole('button', { name: 'Add Crime' }).click();
    const offenseRow = page.getByRole('row').filter({ hasText: offenseName });
    await expect(offenseRow).toBeVisible();
    await expect(offenseRow.getByRole('button', { name: 'Edit' })).toHaveClass(/btn-compact/);
    await expect(offenseRow.getByRole('button', { name: 'Delete' })).toHaveClass(
        /btn-danger-outline/,
    );
    await expect(page.getByRole('button', { name: 'Deactivate' })).toHaveCount(0);
    await offenseRow.getByRole('button', { name: 'Delete' }).click();
    const deleteDialog = page.getByRole('alertdialog', { name: 'Delete Crime' });
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Delete Crime' }).click();
    await expect(offenseRow).toHaveCount(0);
    await logout(page);

    let response;
    await login(page, 'e2e_prosecutor', '/subpoena-reviews');
    await expect(page.getByRole('heading', { name: 'Your Work Overview' })).toBeVisible();
    await expect(page.getByText('Pending Subpoena Reviews', { exact: true })).toBeVisible();
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
    await page.goto('/cases');
    await expectRoleCaseList(page, 'prosecutor');
    await expect(page.getByRole('columnheader', { name: 'Verdict Date', exact: true })).toHaveCount(
        0,
    );
    await expect(page.getByRole('columnheader', { name: 'Actions', exact: true })).toHaveCount(0);
    const prosecutorCasesTable = page.getByRole('region', { name: 'Cases table' });
    for (const width of [1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
            await prosecutorCasesTable.evaluate(
                (element) => element.scrollWidth <= element.clientWidth,
            ),
        ).toBe(true);
    }
    await expect(prosecutorCasesTable.getByText('Due for Hearing', { exact: true })).toBeVisible();
    await expect(prosecutorCasesTable.getByText('Resolved', { exact: true })).toBeVisible();
    await page.getByLabel('Search', { exact: true }).fill('Qualified');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page).toHaveURL(/\/cases\?.*search=Qualified/);
    const caseViewLink = page.getByRole('link', { name: /^Open case / }).first();
    await expect(caseViewLink).toHaveAttribute('href', /^\/cases\/[0-9a-f-]+\?return_to=/);
    await caseViewLink.focus();
    await expect(caseViewLink).toBeFocused();
    expect(
        await caseViewLink.locator('xpath=ancestor::tr').evaluate((row) => {
            const style = window.getComputedStyle(row);
            return [style.outlineStyle, style.outlineWidth];
        }),
    ).toEqual(['solid', '3px']);
    await caseViewLink.press('Enter');
    await expect(page).toHaveURL(/\/cases\/[0-9a-f-]+\?return_to=/);
    await page.getByRole('link', { name: 'Back to Cases' }).click();
    await expect(page).toHaveURL(/\/cases\?.*search=Qualified/);
    await logout(page);

    await login(page, 'e2e_secretary', '/cases');
    await expect(page.getByRole('heading', { name: 'Work Overview' })).toBeVisible();
    await expect(page.getByText('Assigned Cases', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Cases', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Subpoena Review' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Manage Crimes' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Verifying Cases' })).toBeVisible();
    await expectRoleCaseList(page);
    expect(
        await page
            .getByRole('region', { name: 'Cases table' })
            .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    await expect(page.getByRole('columnheader', { name: 'Command', exact: true })).toBeVisible();
    const secretaryCasesTable = page.getByRole('region', { name: 'Cases table' });
    const secretaryGeneratePdf = secretaryCasesTable
        .getByRole('button', { name: 'Generate PDF' })
        .first();
    await expect(secretaryGeneratePdf).toBeVisible();
    await expect(secretaryGeneratePdf).toHaveClass(/btn-secondary/);
    await expect(secretaryGeneratePdf).toHaveClass(/btn-compact/);
    await expect(secretaryGeneratePdf).toHaveCSS('min-height', '36px');
    expect(
        await secretaryGeneratePdf.locator('xpath=parent::*').evaluate((group) => {
            const style = window.getComputedStyle(group);

            return [style.display, style.flexWrap, style.gap];
        }),
    ).toEqual(['flex', 'wrap', '8px']);
    for (const viewport of [
        { width: 768, height: 1024 },
        { width: 375, height: 812 },
    ]) {
        await page.setViewportSize(viewport);
        const casesList = page.getByRole('region', { name: 'Cases list' });
        await expect(casesList).toBeVisible();
        await expect(casesList.getByRole('button', { name: 'Generate PDF' }).first()).toHaveClass(
            /btn-compact/,
        );
        expect(
            await casesList
                .locator('.action-group')
                .evaluateAll((groups) =>
                    groups.every((group) => group.scrollWidth <= group.clientWidth),
                ),
        ).toBe(true);
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole('button', { name: 'Generate PDF' }).first()).toHaveClass(
        /btn-compact/,
    );
    await page.getByRole('link', { name: 'Verifying Cases' }).click();
    await expect(page).toHaveURL(/\/secretary\/verifying-cases/);
    await expect(page.getByRole('link', { name: 'Verifying Cases' })).toHaveAttribute(
        'aria-current',
        'page',
    );
    await expect(page.getByRole('heading', { name: 'Subpoenas', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Resolutions', exact: true })).toBeVisible();
    await expect(
        page
            .getByRole('region', { name: 'Subpoena verification table' })
            .getByText('Pending', { exact: true })
            .first(),
    ).toBeVisible();
    await expect(
        page
            .getByRole('region', { name: 'Resolution verification table' })
            .getByText('For Filing', { exact: true })
            .first(),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /^Open Subpoena case / }).first()).toBeVisible();
    await expect(
        page.getByRole('link', { name: /^Open Resolution for case / }).first(),
    ).toBeVisible();
    const subpoenaVerificationTable = page.getByRole('region', {
        name: 'Subpoena verification table',
    });
    const editAction = subpoenaVerificationTable.getByRole('link', { name: 'Edit' }).first();
    const generatePdfAction = subpoenaVerificationTable
        .getByRole('button', {
            name: 'Generate PDF',
        })
        .first();
    await expect(editAction).toHaveAttribute('href', /^\/cases\/[0-9a-f-]+\/edit$/);
    for (const action of [editAction, generatePdfAction]) {
        await expect(action).toHaveClass(/btn-secondary/);
        await expect(action).toHaveClass(/btn-compact/);
        await expect(action).toHaveCSS('min-height', '36px');
    }
    expect(
        await editAction.locator('xpath=parent::*').evaluate((group) => {
            const style = window.getComputedStyle(group);

            return [style.display, style.flexWrap, style.gap];
        }),
    ).toEqual(['flex', 'wrap', '8px']);
    await editAction.click();
    await expect(page).toHaveURL(/\/cases\/[0-9a-f-]+\/edit$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/secretary\/verifying-cases/);
    const verificationDocumentRequest = page.waitForRequest(
        (request) => request.method() === 'POST' && request.url().includes('/documents/subpoena'),
    );
    await generatePdfAction.click();
    await verificationDocumentRequest;
    await expect(page).toHaveURL(/\/cases\/[0-9a-f-]+$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/secretary\/verifying-cases/);
    for (const viewport of [
        { width: 768, height: 1024 },
        { width: 375, height: 812 },
    ]) {
        await page.setViewportSize(viewport);
        const subpoenaVerificationList = page.getByRole('region', {
            name: 'Subpoena verification list',
        });
        await expect(subpoenaVerificationList).toBeVisible();
        await expect(
            subpoenaVerificationList.getByRole('link', { name: 'Edit' }).first(),
        ).toHaveClass(/btn-compact/);
        await expect(
            subpoenaVerificationList.getByRole('button', { name: 'Generate PDF' }).first(),
        ).toHaveClass(/btn-compact/);
        expect(
            await subpoenaVerificationList
                .locator('.action-group')
                .evaluateAll((groups) =>
                    groups.every((group) => group.scrollWidth <= group.clientWidth),
                ),
        ).toBe(true);
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const regionName of ['Subpoena verification table', 'Resolution verification table']) {
        const verificationTable = page.getByRole('region', { name: regionName });
        expect(
            await verificationTable.evaluate(
                (element) => element.scrollWidth <= element.clientWidth,
            ),
        ).toBe(true);
    }
    expect(
        await page
            .locator('main')
            .evaluate((main) => main.querySelector('a a, a button, button a') === null),
    ).toBe(true);
    await expect(page.getByRole('button', { name: /Approve|Deny/ })).toHaveCount(0);
    await page.goto('/secretary/verifying-cases?sub_page=2&res_page=2');
    await page.getByLabel('Search', { exact: true }).first().fill('E2E');
    await page.getByRole('button', { name: 'Apply' }).first().click();
    await expect.poll(() => new URL(page.url()).searchParams.get('sub_page')).toBe('2');
    await expect.poll(() => new URL(page.url()).searchParams.get('res_page')).toBe('2');
    response = await page.goto('/resolution-reviews');
    expect(response?.status()).toBe(403);
    response = await page.goto('/dashboard');
    expect(response?.status()).toBe(403);
    await page.goto('/cases');
    await logout(page);

    await login(page, 'e2e_process_server', '/process-server/cases');
    await expect(page.getByRole('heading', { name: 'Work Overview' })).toBeVisible();
    await expect(page.getByText('Visible Cases', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Cases' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reports' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Manage Crimes' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Verifying Cases' })).toHaveCount(0);
    await expectRoleCaseList(page, 'processServer');
    await expect(
        page.getByRole('columnheader', { name: 'Verdict Date', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Command' })).toHaveCount(0);
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
    await expect(casesTable.getByRole('link')).toHaveCount(0);
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

    const policeStation = page.getByLabel('Police Station');
    await expect(policeStation).toHaveAttribute('list', 'legacy-police-stations');
    await expect(
        page.locator('#legacy-police-stations option[value="PNP, Peñaranda, Nueva Ecija"]'),
    ).toBeAttached();

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

test('queued Subpoena document lifecycle refreshes once and stops polling when ready', async ({
    page,
}) => {
    test.setTimeout(60_000);
    await login(page, 'e2e_secretary', '/cases');
    const pendingCase = page.getByRole('row').filter({ hasText: 'III-09-INV-26G-0002' });
    const documentRequest = page.waitForRequest(
        (request) => request.method() === 'POST' && request.url().includes('/documents/subpoena'),
    );
    await pendingCase.getByRole('button', { name: 'Generate PDF' }).click();
    await documentRequest;
    await expect(page).toHaveURL(/\/cases\/[0-9a-f-]+$/);
    await expect(page.getByText('Generating', { exact: true })).toBeVisible();

    await execFileAsync(
        'php',
        [
            'artisan',
            'queue:work',
            'database',
            '--queue=documents',
            '--once',
            '--stop-when-empty',
            '--timeout=120',
            '--env=testing',
        ],
        { cwd: process.cwd(), env: { ...process.env, APP_ENV: 'testing' } },
    );

    await expect(page.getByRole('link', { name: 'View PDF' })).toBeVisible({
        timeout: 30_000,
    });

    let subsequentCaseReloads = 0;
    page.on('request', (request) => {
        if (
            request.method() === 'GET' &&
            new URL(request.url()).pathname === new URL(page.url()).pathname
        ) {
            subsequentCaseReloads += 1;
        }
    });
    await page.waitForTimeout(2500);
    expect(subsequentCaseReloads).toBe(0);
});

test('public lookup and administrator report preserve approved behavior', async ({ page }) => {
    await page.goto('/docket');
    await page.getByLabel('Docket Number').fill('III-09-INV-26G-0001');
    await page.getByLabel('PIN Code').fill('246810');
    await page.getByRole('button', { name: 'Access' }).click();
    await expect(page.getByText('For Filing', { exact: true })).toBeVisible();
    await expect(page.getByText('RTC Cabanatuan', { exact: true })).toBeVisible();

    await login(page, 'e2e_admin', '/dashboard');
    await page
        .getByRole('navigation', { name: 'Staff navigation' })
        .getByRole('link', { name: 'Reports' })
        .click();
    await page.getByRole('button', { name: 'Generate' }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('generate')).toBe('1');
    await expect(page.getByRole('heading', { name: 'Case Summary' })).toBeVisible();
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
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');
    const mobileLoginLogo = page.getByRole('img', { name: 'Department of Justice seal' });
    await expect(mobileLoginLogo).toBeVisible();
    await expect(mobileLoginLogo).toHaveCount(1);
    await expect(mobileLoginLogo).toHaveCSS('height', '44px');
    await expect(page.getByText('LV', { exact: true })).toHaveCount(0);
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await page.goto('/docket');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await login(page, 'e2e_secretary', '/cases');
    expect(
        (await new AxeBuilder({ page }).include('#operational-summary-heading').analyze())
            .violations,
    ).toEqual([]);
    const navigationToggle = page.getByRole('button', { name: /Navigation/ });
    await expect(navigationToggle).toHaveAttribute('aria-expanded', 'false');
    await navigationToggle.focus();
    await navigationToggle.press('Enter');
    await expect(navigationToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('link', { name: 'Cases', exact: true })).toBeVisible();
    await navigationToggle.press('Enter');
    await expect(page.getByRole('region', { name: 'Cases list' })).toBeVisible();
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.goto('/secretary/verifying-cases');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(page.getByRole('region', { name: 'Subpoena verification list' })).toBeVisible();
    await logout(page);

    await login(page, 'e2e_prosecutor', '/subpoena-reviews');
    expect(
        (await new AxeBuilder({ page }).include('#operational-summary-heading').analyze())
            .violations,
    ).toEqual([]);
    await expect(page.getByRole('region', { name: 'Subpoena Review list' })).toBeVisible();
    await page.getByLabel('Sort by').selectOption('docket_number');
    await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('docket_number');
    await page.getByRole('link', { name: 'Review', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Revision Comparison' })).toBeVisible();
    await expect(page.getByLabel('Subpoena revision comparison', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Revision submission details')).toContainText('Submitted by');
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await logout(page);

    await login(page, 'e2e_admin', '/dashboard');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.goto('/admin/reports?verdict=For%20Filing');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expectChartRendered(page, 'chart-crime-distribution');
    await page.goto('/admin/audit');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await expect(page.getByRole('region', { name: 'Audit History' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Audit events' })).toBeVisible();
    const auditPagination = page.getByRole('navigation', { name: 'Pagination' });
    await expect(page.getByText(/^Showing \d+ to \d+ of \d+ records\.$/)).toBeVisible();
    expect(
        await auditPagination
            .getByRole('link')
            .evaluateAll(
                (links) =>
                    links.filter((link) => /^\d+$/.test(link.textContent?.trim() ?? '')).length,
            ),
    ).toBeLessThanOrEqual(5);
    const firstAuditEvent = page
        .getByRole('list', { name: 'Audit events' })
        .locator('article')
        .first();
    await expect(firstAuditEvent.locator('time span')).toHaveCount(2);
    await expect(firstAuditEvent.locator('time span').nth(1)).toHaveText(/^\d{1,2}:\d{2} (AM|PM)$/);
    expect(await page.locator('main').innerText()).not.toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
    );
    expect(
        await page.evaluate(() => {
            window.scrollTo({ left: document.documentElement.scrollWidth });
            return window.scrollX === 0;
        }),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.getByRole('link', { name: 'Next' }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBe('2');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(100);
    await page.goto('/admin/audit');
    await page.getByLabel('Search', { exact: true }).fill('auth.login');
    await page.getByLabel('Filter').selectOption('action');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByText('auth.login', { exact: true }).first()).toBeVisible();
    await page.getByRole('link', { name: 'View details' }).first().click();
    await expect(page.getByRole('heading', { name: 'Event Summary' })).toBeVisible();
    await expect(page.getByText('Technical identifiers')).toBeVisible();
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
    expect(
        await crimeTable
            .locator('th')
            .first()
            .evaluate((element) => {
                const style = window.getComputedStyle(element);

                return [style.paddingTop, style.paddingLeft];
            }),
    ).toEqual(['10px', '16px']);
    await page.goto('/admin/assignments');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);

    const administratorPaths = [
        '/dashboard',
        '/cases',
        '/cases/create',
        '/resolution-reviews',
        '/admin/users',
        '/admin/users/create',
        '/admin/assignments',
        '/admin/offenses',
        '/admin/reports',
        '/admin/audit',
    ];

    await page.goto('/cases');
    const caseDetailLink = page.getByRole('link', { name: /^Open case / }).first();
    const caseDetailPath = (await caseDetailLink.count())
        ? await caseDetailLink.getAttribute('href')
        : null;
    await page.goto('/resolution-reviews');
    const resolutionDetailLink = page
        .getByRole('link', { name: /^Review Resolution for case / })
        .first();
    const resolutionDetailPath = (await resolutionDetailLink.count())
        ? await resolutionDetailLink.getAttribute('href')
        : null;
    await page.goto('/admin/audit');
    const auditDetailLink = page.getByRole('link', { name: 'View details' }).first();
    const auditDetailPath = (await auditDetailLink.count())
        ? await auditDetailLink.getAttribute('href')
        : null;

    for (const path of [caseDetailPath, resolutionDetailPath, auditDetailPath]) {
        if (path) administratorPaths.push(path);
    }

    for (const viewport of [
        { width: 1440, height: 900 },
        { width: 768, height: 1024 },
        { width: 375, height: 812 },
    ]) {
        await page.setViewportSize(viewport);
        for (const path of administratorPaths) {
            await page.goto(path);
            await expectAdministratorPresentation(page);
            if (viewport.width === 375) {
                expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
            }
        }
    }
});
