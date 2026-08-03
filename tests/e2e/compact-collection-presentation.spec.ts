import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const password = 'E2E-only-password';

type InertiaCase = {
    id: string;
    docket_number: string;
    offenses: string[];
    complainants: string[];
    respondents: string[];
    [key: string]: unknown;
};

async function login(page: Page, username: string, landing: string) {
    await page.goto('/login');
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL((url) => url.pathname === landing);
}

async function installCasesProjection(page: Page) {
    await page.route('**/cases**', async (route) => {
        const request = route.request();

        if (request.method() !== 'GET' || request.headers()['x-inertia'] !== 'true') {
            await route.continue();
            return;
        }

        const response = await route.fetch();
        const payload = (await response.json()) as {
            props?: {
                cases?: { data?: InertiaCase[]; total?: number; from?: number; to?: number };
            };
        };
        const records = payload.props?.cases?.data;

        if (!records?.length) {
            await route.fulfill({ response });
            return;
        }

        const source = records[0];
        const projected = [
            {
                ...source,
                offenses: [
                    'Qualified Theft',
                    'Complex Offense with an Exceptionally Long Canonical Name That Wraps Naturally',
                    'Repeated Offense',
                    'Repeated Offense',
                ],
                complainants: ['Complainant One', 'Complainant Two', 'Complainant Three'],
                respondents: [
                    'Respondent One',
                    'Respondent Two',
                    'Respondent Three',
                    'Respondent Four',
                    'Respondent Five',
                    'Respondent Six',
                    'Respondent Seven',
                ],
            },
            projectCase(source, '00000000-0000-4000-8000-000000000001', 'EMPTY-COLLECTIONS', {
                offenses: [],
                complainants: [],
                respondents: [],
            }),
            projectCase(source, '00000000-0000-4000-8000-000000000002', 'ONE-ITEM', {
                offenses: ['One Offense'],
                complainants: ['One Complainant'],
                respondents: ['One Respondent'],
            }),
            projectCase(source, '00000000-0000-4000-8000-000000000003', 'TWO-ITEMS', {
                offenses: ['First Offense', 'Second Offense'],
                complainants: ['First Complainant', 'Second Complainant'],
                respondents: ['First Respondent', 'Second Respondent'],
            }),
            projectCase(source, '00000000-0000-4000-8000-000000000004', 'ONE-MORE-OFFENSE', {
                offenses: ['First Offense', 'Second Offense', 'Third Offense'],
                complainants: [],
                respondents: [],
            }),
        ];

        payload.props!.cases!.data = projected;
        payload.props!.cases!.total = projected.length;
        payload.props!.cases!.from = 1;
        payload.props!.cases!.to = projected.length;

        await route.fulfill({ response, json: payload });
    });
}

function projectCase(
    source: InertiaCase,
    id: string,
    docketNumber: string,
    collections: Pick<InertiaCase, 'offenses' | 'complainants' | 'respondents'>,
): InertiaCase {
    return {
        ...source,
        id,
        docket_number: docketNumber,
        ...collections,
        can_submit_resolution: false,
        can_generate_subpoena: false,
    };
}

async function openProjectedCases(page: Page) {
    await page.getByRole('link', { name: 'Cases', exact: true }).first().click();
    await expect(page.getByText('EMPTY-COLLECTIONS', { exact: true })).toHaveCount(2);
}

async function tableGeometry(table: Locator) {
    return table.evaluate((element) => {
        const tableBox = element.getBoundingClientRect();
        const headers = Array.from(element.querySelectorAll('thead th')).map((header) => {
            const box = header.getBoundingClientRect();
            return { x: box.x, width: box.width };
        });

        return { width: tableBox.width, headers };
    });
}

async function expectGeometryUnchanged(
    before: Awaited<ReturnType<typeof tableGeometry>>,
    after: Awaited<ReturnType<typeof tableGeometry>>,
) {
    expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(1);
    expect(after.headers).toHaveLength(before.headers.length);

    after.headers.forEach((header, index) => {
        expect(Math.abs(header.x - before.headers[index].x)).toBeLessThanOrEqual(1);
        expect(Math.abs(header.width - before.headers[index].width)).toBeLessThanOrEqual(1);
    });
}

async function expectNoPageOverflow(page: Page) {
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
}

async function expectDisclosureGap(list: Locator, button: Locator) {
    const gap = await button.evaluate((element) => {
        const controlledId = element.getAttribute('aria-controls');
        const controlledElement = controlledId ? document.getElementById(controlledId) : null;

        if (!controlledElement) return Number.NaN;

        return (
            element.getBoundingClientRect().top - controlledElement.getBoundingClientRect().bottom
        );
    });

    expect(Math.abs(gap - 2)).toBeLessThanOrEqual(0.5);
    await expect(list).toBeVisible();
}

async function expectCombinedCaseCell(row: Locator) {
    const caseCell = row.locator('td').first();
    const docket = caseCell.locator('.table-cell-primary');
    const offenses = caseCell.locator('[id$="-desktop-offenses"]');
    const gap = await offenses.evaluate((element) => {
        const docketElement = element.closest('td')?.querySelector('.table-cell-primary');

        return docketElement
            ? element.getBoundingClientRect().top - docketElement.getBoundingClientRect().bottom
            : Number.NaN;
    });

    await expect(docket).toBeVisible();
    await expect(offenses).toBeVisible();
    expect(Math.abs(gap - 4)).toBeLessThanOrEqual(0.5);
}

test('Cases collections expand independently without changing table geometry or row navigation', async ({
    page,
}) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, 'e2e_admin', '/dashboard');
    await installCasesProjection(page);
    await openProjectedCases(page);

    const tableRegion = page.getByRole('region', { name: 'Cases table' });
    const table = tableRegion.locator('table');
    const firstRow = tableRegion.locator('tbody tr').first();
    const offenseList = firstRow.locator('[id$="-desktop-offenses"]');
    const offenseButton = firstRow.locator('button[aria-controls$="-desktop-offenses"]');
    const complainantButton = firstRow.locator('button[aria-controls$="-desktop-complainants"]');
    const respondentButton = firstRow.locator('button[aria-controls$="-desktop-respondents"]');

    await expectCombinedCaseCell(firstRow);
    await expect(
        tableRegion.getByRole('columnheader', { name: 'Case', exact: true }),
    ).toBeVisible();
    await expect(tableRegion.getByRole('columnheader', { name: 'Docket No.' })).toHaveCount(0);
    await expect(offenseButton).toHaveText('Show all 4 offenses');
    await expect(complainantButton).toHaveText('Show 1 remaining party');
    await expect(respondentButton).toHaveText('Show all 7 parties');
    await expectDisclosureGap(offenseList, offenseButton);
    await expect(offenseList.locator('li')).toHaveText([
        'Qualified Theft',
        'Complex Offense with an Exceptionally Long Canonical Name That Wraps Naturally',
    ]);
    expect(
        await offenseList
            .locator('li')
            .evaluateAll((items) =>
                items.every(
                    (item, index) =>
                        index === 0 ||
                        item.getBoundingClientRect().top >
                            items[index - 1].getBoundingClientRect().top,
                ),
            ),
    ).toBe(true);

    const beforeGeometry = await tableGeometry(table);
    const beforeRowHeight = (await firstRow.boundingBox())!.height;
    await offenseButton.click();
    await expect(offenseButton).toBeFocused();
    await expect(offenseButton).toHaveAttribute('aria-expanded', 'true');
    await expect(offenseList.locator('li')).toHaveText([
        'Qualified Theft',
        'Complex Offense with an Exceptionally Long Canonical Name That Wraps Naturally',
        'Repeated Offense',
        'Repeated Offense',
    ]);
    await expectDisclosureGap(offenseList, offenseButton);
    await expectGeometryUnchanged(beforeGeometry, await tableGeometry(table));
    expect((await firstRow.boundingBox())!.height).toBeGreaterThanOrEqual(beforeRowHeight);

    await complainantButton.focus();
    await complainantButton.press('Enter');
    await expect(complainantButton).toBeFocused();
    await expect(complainantButton).toHaveAttribute('aria-expanded', 'true');
    await expect(offenseButton).toHaveAttribute('aria-expanded', 'true');

    await respondentButton.focus();
    await respondentButton.press('Space');
    await expect(respondentButton).toBeFocused();
    await expect(respondentButton).toHaveAttribute('aria-expanded', 'true');
    await expect(complainantButton).toHaveAttribute('aria-expanded', 'true');
    await expectGeometryUnchanged(beforeGeometry, await tableGeometry(table));
    expect((await firstRow.boundingBox())!.height).toBeGreaterThan(beforeRowHeight);

    await respondentButton.press('Space');
    await complainantButton.press('Enter');
    await offenseButton.click();
    await expect(offenseButton).toHaveAttribute('aria-expanded', 'false');
    await expectGeometryUnchanged(beforeGeometry, await tableGeometry(table));
    expect(Math.abs((await firstRow.boundingBox())!.height - beforeRowHeight)).toBeLessThanOrEqual(
        1,
    );

    const controlledIds = await page
        .locator('button[aria-controls^="case-"]')
        .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-controls')));
    expect(new Set(controlledIds).size).toBe(controlledIds.length);

    const emptyRow = tableRegion.locator('tbody tr').filter({ hasText: 'EMPTY-COLLECTIONS' });
    const oneItemRow = tableRegion.locator('tbody tr').filter({ hasText: 'ONE-ITEM' });
    const twoItemRow = tableRegion.locator('tbody tr').filter({ hasText: 'TWO-ITEMS' });
    const singularRow = tableRegion.locator('tbody tr').filter({ hasText: 'ONE-MORE-OFFENSE' });
    await expect(emptyRow.getByRole('button', { name: /Show/ })).toHaveCount(0);
    await expect(emptyRow.locator('[id$="-desktop-offenses"]')).toHaveText('-');
    await expect(emptyRow.locator('[id$="-desktop-complainants"]')).toHaveText('-');
    await expect(emptyRow.locator('[id$="-desktop-respondents"]')).toHaveText('-');
    await expect(oneItemRow.getByRole('button', { name: /Show/ })).toHaveCount(0);
    await expect(twoItemRow.getByRole('button', { name: /Show/ })).toHaveCount(0);
    await expect(
        singularRow.getByRole('button', { name: 'Show 1 remaining offense' }),
    ).toBeVisible();

    if (await firstRow.getByRole('button', { name: 'Generate PDF' }).count()) {
        await expect(firstRow.getByRole('button', { name: 'Generate PDF' })).toHaveClass(
            /btn-secondary/,
        );
    }

    await expectNoPageOverflow(page);
    const accessibility = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
    expect(
        accessibility.violations.filter((violation) =>
            ['serious', 'critical'].includes(violation.impact ?? ''),
        ),
    ).toEqual([]);

    const rowLink = firstRow.getByRole('link', { name: /^Open case / });
    const rowHref = await rowLink.getAttribute('href');
    const firstItemBox = await firstRow.locator('li').first().boundingBox();
    expect(rowHref).not.toBeNull();
    expect(firstItemBox).not.toBeNull();
    await page.mouse.click(firstItemBox!.x + 4, firstItemBox!.y + 4);
    await expect(page).toHaveURL(new URL(rowHref!, 'http://127.0.0.1:8008').toString());
});

test('mobile collection state is independent and remains responsive', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 768, height: 1024 });
    await login(page, 'e2e_admin', '/dashboard');
    await installCasesProjection(page);
    await openProjectedCases(page);

    const list = page.getByRole('region', { name: 'Cases list' });
    const firstCard = list.locator('li').first();
    const offenseButton = firstCard.locator('button[aria-controls$="-mobile-offenses"]');
    await expect(offenseButton).toHaveText('Show all 4 offenses');
    await offenseButton.click();
    await expect(offenseButton).toBeFocused();
    await expect(firstCard.locator('[id$="-mobile-offenses"] li')).toHaveCount(4);
    await expectNoPageOverflow(page);

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(firstCard.getByRole('button', { name: 'Show less' })).toBeVisible();
    await expectNoPageOverflow(page);
});

for (const role of [
    { username: 'e2e_secretary', landing: '/cases', navigable: true },
    { username: 'e2e_prosecutor', landing: '/subpoena-reviews', navigable: true },
    { username: 'e2e_process_server', landing: '/process-server/cases', navigable: false },
]) {
    test(`${role.username} retains its authoritative Cases projection`, async ({ page }) => {
        test.setTimeout(120_000);
        await page.setViewportSize({ width: 1440, height: 900 });
        await login(page, role.username, role.landing);
        await installCasesProjection(page);
        await openProjectedCases(page);

        const tableRegion = page.getByRole('region', { name: 'Cases table' });
        const firstRow = tableRegion.locator('tbody tr').first();
        await expectCombinedCaseCell(firstRow);
        await expect(
            tableRegion.getByRole('columnheader', { name: 'Case', exact: true }),
        ).toBeVisible();
        await expect(firstRow.getByRole('button', { name: 'Show all 4 offenses' })).toBeVisible();
        await expect(
            firstRow.getByRole('button', { name: 'Show 1 remaining party' }),
        ).toBeVisible();
        await expect(firstRow.getByRole('button', { name: 'Show all 7 parties' })).toBeVisible();

        if (role.navigable) {
            await expect(firstRow.getByRole('link', { name: /^Open case / })).toHaveCount(1);
        } else {
            await expect(firstRow.getByRole('link')).toHaveCount(0);
        }

        await expectNoPageOverflow(page);
    });
}
