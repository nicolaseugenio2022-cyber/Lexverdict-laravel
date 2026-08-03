import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const password = 'E2E-only-password';
const longOffenses = [
    'Qualified Theft',
    'Complex Offense with an Exceptionally Long Canonical Name That Wraps Naturally',
    'Repeated Offense',
    'Repeated Offense',
];

type QueueRecord = {
    id?: string;
    case_id?: string;
    docket_number: string;
    offenses: string[];
    [key: string]: unknown;
};

type PaginatedQueue = {
    data: QueueRecord[];
    from?: number | null;
    to?: number | null;
    total?: number;
};

type InertiaPayload = {
    props?: Record<string, unknown>;
};

async function login(page: Page, username: string, landing: string) {
    await page.goto('/login');
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL((url) => url.pathname === landing);
}

async function interceptInertiaPage(
    page: Page,
    pathname: string,
    update: (payload: InertiaPayload) => void,
) {
    await page.route(`**${pathname}*`, async (route) => {
        const request = route.request();
        const url = new URL(request.url());

        if (
            url.pathname !== pathname ||
            request.method() !== 'GET' ||
            request.headers()['x-inertia'] !== 'true'
        ) {
            await route.continue();
            return;
        }

        const response = await route.fetch();
        const payload = (await response.json()) as InertiaPayload;
        update(payload);
        await route.fulfill({ response, json: payload });
    });
}

function queue(payload: InertiaPayload, key: string): PaginatedQueue | null {
    const value = payload.props?.[key];

    if (!value || typeof value !== 'object' || !('data' in value)) return null;

    return value as PaginatedQueue;
}

function projectQueue(sourceQueue: PaginatedQueue, idKey: 'id' | 'case_id') {
    const source = sourceQueue.data[0];
    if (!source) return;

    const records: QueueRecord[] = [
        { ...source, offenses: longOffenses },
        projectRecord(source, idKey, '00000000-0000-4000-8000-000000000001', 'EMPTY', []),
        projectRecord(source, idKey, '00000000-0000-4000-8000-000000000002', 'ONE-OFFENSE', [
            'One Offense',
        ]),
        projectRecord(source, idKey, '00000000-0000-4000-8000-000000000003', 'TWO-OFFENSES', [
            'First Offense',
            'Second Offense',
        ]),
        projectRecord(source, idKey, '00000000-0000-4000-8000-000000000004', 'ONE-REMAINING', [
            'First Offense',
            'Second Offense',
            'Third Offense',
        ]),
    ];

    sourceQueue.data = records;
    sourceQueue.from = 1;
    sourceQueue.to = records.length;
    sourceQueue.total = records.length;
}

function projectRecord(
    source: QueueRecord,
    idKey: 'id' | 'case_id',
    id: string,
    docketNumber: string,
    offenses: string[],
): QueueRecord {
    return { ...source, [idKey]: id, docket_number: docketNumber, offenses };
}

function projectResolutionQueue(sourceQueue: PaginatedQueue) {
    const source = sourceQueue.data[0] ?? {
        id: '00000000-0000-4000-8000-000000000010',
        docket_number: 'RESOLUTION-QUEUE-PARITY',
        verdict: 'For Filing',
        court: 'Regional Trial Court',
        verdict_date: '2026-08-01',
        revision_number: 1,
        submitted_by: 'Test Secretary',
        assigned_prosecutor: 'Test Prosecutor',
        complainants: ['Test Complainant'],
        respondents: ['Test Respondent'],
        offenses: [],
    };

    sourceQueue.data = [{ ...source, offenses: longOffenses }];
    sourceQueue.from = 1;
    sourceQueue.to = 1;
    sourceQueue.total = 1;
}

async function geometry(table: Locator) {
    return table.evaluate((element) => {
        const tableBox = element.getBoundingClientRect();
        const headers = Array.from(element.querySelectorAll('thead th')).map((header) => {
            const box = header.getBoundingClientRect();
            return { x: box.x, width: box.width };
        });

        return { width: tableBox.width, headers };
    });
}

async function collectionGeometry(row: Locator) {
    const list = row.locator('[id$="-desktop-offenses"]');
    const button = row.locator('button[aria-controls$="-desktop-offenses"]');
    const docket = row.locator('td').first().locator('.table-cell-primary');
    const collapsedRowHeight = (await row.boundingBox())!.height;
    const collapsedListHeight = (await list.boundingBox())!.height;
    const buttonHeight = (await button.boundingBox())!.height;
    const docketGap = await list.evaluate((element, docketSelector) => {
        const docketElement = element.closest('td')?.querySelector(docketSelector);
        if (!docketElement) return Number.NaN;

        return element.getBoundingClientRect().top - docketElement.getBoundingClientRect().bottom;
    }, '.table-cell-primary');

    await button.click();

    return {
        collapsedRowHeight,
        expandedRowHeight: (await row.boundingBox())!.height,
        collapsedListHeight,
        expandedListHeight: (await list.boundingBox())!.height,
        buttonHeight,
        docketGap,
        docket,
        button,
    };
}

async function caseCellPresentation(row: Locator) {
    const caseCell = row.locator('td').first();
    const primary = caseCell.locator('.table-cell-primary');
    const offenses = caseCell.locator('[id$="-desktop-offenses"]');

    await expect(primary).toBeVisible();
    await expect(offenses).toBeVisible();

    return caseCell.evaluate((element) => {
        const primaryElement = element.querySelector<HTMLElement>('.table-cell-primary');
        const offensesElement = element.querySelector<HTMLElement>('[id$="-desktop-offenses"]');

        if (!primaryElement || !offensesElement) return null;

        const primaryStyle = window.getComputedStyle(primaryElement);
        const offenseStyle = window.getComputedStyle(offensesElement);

        return {
            gap:
                offensesElement.getBoundingClientRect().top -
                primaryElement.getBoundingClientRect().bottom,
            primary: {
                fontFamily: primaryStyle.fontFamily,
                fontSize: primaryStyle.fontSize,
                fontWeight: primaryStyle.fontWeight,
                lineHeight: primaryStyle.lineHeight,
            },
            offenses: {
                fontFamily: offenseStyle.fontFamily,
                fontSize: offenseStyle.fontSize,
                fontWeight: offenseStyle.fontWeight,
                lineHeight: offenseStyle.lineHeight,
            },
        };
    });
}

function expectCaseCellPresentation(
    reference: Awaited<ReturnType<typeof caseCellPresentation>>,
    actual: Awaited<ReturnType<typeof caseCellPresentation>>,
) {
    expect(reference).not.toBeNull();
    expect(actual).not.toBeNull();
    expect(actual?.primary).toEqual(reference?.primary);
    expect(actual?.offenses).toEqual(reference?.offenses);
    expect(Math.abs((actual?.gap ?? Number.NaN) - 4)).toBeLessThanOrEqual(0.5);
}

function expectGeometryUnchanged(
    before: Awaited<ReturnType<typeof geometry>>,
    after: Awaited<ReturnType<typeof geometry>>,
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

async function expectAccessible(page: Page, selector: string) {
    const results = await new AxeBuilder({ page })
        .include(selector)
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

    expect(
        results.violations.filter((violation) =>
            ['serious', 'critical'].includes(violation.impact ?? ''),
        ),
    ).toEqual([]);
}

test('Secretary verification queues use independent compact offense collections', async ({
    page,
}) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, 'e2e_secretary', '/cases');
    await interceptInertiaPage(page, '/cases', (payload) => {
        const cases = queue(payload, 'cases');
        if (cases?.data[0]) cases.data[0].offenses = longOffenses;
    });
    await page.goto('/secretary/verifying-cases');
    await page.getByRole('link', { name: 'Cases', exact: true }).first().click();

    const casesTable = page.getByRole('region', { name: 'Cases table' });
    const casesRow = casesTable.locator('tbody tr').first();
    const casesCollection = await collectionGeometry(casesRow);

    await interceptInertiaPage(page, '/secretary/verifying-cases', (payload) => {
        for (const key of ['subpoenas', 'resolutions']) {
            const projectedQueue = queue(payload, key);
            if (projectedQueue?.data[0]) projectedQueue.data[0].offenses = longOffenses;
        }
    });
    await page.getByRole('link', { name: 'Verifying Cases' }).click();
    await expect(page).toHaveURL('/secretary/verifying-cases');

    const subpoenaTable = page.getByRole('region', { name: 'Subpoena verification table' });
    const resolutionTable = page.getByRole('region', { name: 'Resolution verification table' });
    const subpoenaButton = subpoenaTable.locator(
        'button[aria-controls^="verification-subpoenas-"][aria-controls$="-desktop-offenses"]',
    );
    const resolutionButton = resolutionTable.locator(
        'button[aria-controls^="verification-resolutions-"][aria-controls$="-desktop-offenses"]',
    );
    const currentUrl = page.url();

    const secretaryRow = subpoenaTable.locator('tbody tr').first();
    const secretaryTable = subpoenaTable.locator('table');
    const secretaryBeforeGeometry = await geometry(secretaryTable);
    const secretaryCollection = await collectionGeometry(secretaryRow);
    const collectionGrowth =
        secretaryCollection.expandedListHeight - secretaryCollection.collapsedListHeight;
    const rowGrowth =
        secretaryCollection.expandedRowHeight - secretaryCollection.collapsedRowHeight;

    await expect(secretaryCollection.docket).toBeVisible();
    expect(Math.abs(secretaryCollection.docketGap - 4)).toBeLessThanOrEqual(0.5);
    expect(collectionGrowth).toBeGreaterThan(0);
    expect(rowGrowth).toBeGreaterThanOrEqual(0);
    expect(rowGrowth).toBeLessThanOrEqual(collectionGrowth + 0.5);
    expect(secretaryCollection.buttonHeight).toBe(casesCollection.buttonHeight);
    expectGeometryUnchanged(secretaryBeforeGeometry, await geometry(secretaryTable));
    await expect(secretaryRow.getByText('Crime/Case', { exact: true })).toHaveCount(0);
    await expect(subpoenaButton).toHaveText('Show less');
    await expect(secretaryRow.locator('[id$="-desktop-offenses"] li')).toHaveText(longOffenses);
    await expect(resolutionButton).toHaveText('Show all 4 offenses');
    await expect(secretaryCollection.button).toBeFocused();
    await expect(subpoenaButton).toHaveAttribute('aria-expanded', 'true');
    await expect(resolutionButton).toHaveAttribute('aria-expanded', 'false');
    await expect(page).toHaveURL(currentUrl);

    const ids = await page
        .locator('button[aria-controls^="verification-"]')
        .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-controls')));
    expect(new Set(ids).size).toBe(ids.length);
    await expectNoPageOverflow(page);

    await page.setViewportSize({ width: 375, height: 812 });
    const subpoenaList = page.getByRole('region', { name: 'Subpoena verification list' });
    const mobileButton = subpoenaList.locator(
        'button[aria-controls^="verification-subpoenas-"][aria-controls$="-mobile-offenses"]',
    );
    await expect(mobileButton).toHaveText('Show all 4 offenses');
    await mobileButton.focus();
    await mobileButton.press('Enter');
    await expect(mobileButton).toBeFocused();
    await expect(mobileButton).toHaveAttribute('aria-expanded', 'true');
    await expectNoPageOverflow(page);
    await expectAccessible(
        page,
        '[id^="verification-"][id$="-mobile-offenses"], button[aria-controls^="verification-"][aria-controls$="-mobile-offenses"]',
    );
});

test('Subpoena Review queue preserves compact collection semantics and table geometry', async ({
    page,
}) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, 'e2e_prosecutor', '/subpoena-reviews');
    await page.goto('/cases');
    const casesReference = await caseCellPresentation(
        page.getByRole('region', { name: 'Cases table' }).locator('tbody tr').first(),
    );
    await interceptInertiaPage(page, '/subpoena-reviews', (payload) => {
        const cases = queue(payload, 'cases');
        if (cases) projectQueue(cases, 'id');
    });
    await page.getByRole('link', { name: 'Subpoena Review' }).click();

    const tableRegion = page.getByRole('region', { name: 'Subpoena Review table' });
    const table = tableRegion.locator('table');
    const firstRow = tableRegion.locator('tbody tr').first();
    const list = firstRow.locator('[id$="-desktop-offenses"]');
    const button = firstRow.locator('button[aria-controls$="-desktop-offenses"]');
    const beforeGeometry = await geometry(table);
    const beforeHeight = (await firstRow.boundingBox())!.height;
    const currentUrl = page.url();

    expectCaseCellPresentation(casesReference, await caseCellPresentation(firstRow));
    await expect(
        tableRegion.getByRole('columnheader', { name: /^Case(?: \(sorted\))?$/ }),
    ).toBeVisible();
    await expect(tableRegion.getByRole('columnheader', { name: 'Docket No.' })).toHaveCount(0);
    await expect(tableRegion.getByRole('columnheader', { name: 'Crimes' })).toHaveCount(0);
    await expect(button).toHaveText('Show all 4 offenses');
    await expect(list.locator('li')).toHaveText(longOffenses.slice(0, 2));
    await button.press('Space');
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(list.locator('li')).toHaveText(longOffenses);
    await expect(page).toHaveURL(currentUrl);
    expectGeometryUnchanged(beforeGeometry, await geometry(table));
    expect((await firstRow.boundingBox())!.height).toBeGreaterThanOrEqual(beforeHeight);

    const emptyRow = tableRegion.locator('tbody tr').filter({ hasText: 'EMPTY' });
    const oneRow = tableRegion.locator('tbody tr').filter({ hasText: 'ONE-OFFENSE' });
    const twoRow = tableRegion.locator('tbody tr').filter({ hasText: 'TWO-OFFENSES' });
    const singularRow = tableRegion.locator('tbody tr').filter({ hasText: 'ONE-REMAINING' });
    await expect(emptyRow.getByRole('button', { name: /Show/ })).toHaveCount(0);
    await expect(emptyRow.locator('[id$="-desktop-offenses"]')).toHaveText('');
    await expect(oneRow.getByRole('button', { name: /Show/ })).toHaveCount(0);
    await expect(twoRow.getByRole('button', { name: /Show/ })).toHaveCount(0);
    await expect(
        singularRow.getByRole('button', { name: 'Show 1 remaining offense' }),
    ).toBeVisible();

    await button.click();
    expectGeometryUnchanged(beforeGeometry, await geometry(table));
    expect(Math.abs((await firstRow.boundingBox())!.height - beforeHeight)).toBeLessThanOrEqual(1);
    const reviewLink = firstRow.getByRole('link', { name: 'Review', exact: true });
    await expect(reviewLink).toHaveAttribute('href', /^\/subpoena-reviews\/[0-9a-f-]+$/);
    await tableRegion.getByRole('button', { name: /^Case/ }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('docket_number');
    await expectNoPageOverflow(page);

    await page.setViewportSize({ width: 768, height: 1024 });
    const mobileList = page.getByRole('region', { name: 'Subpoena Review list' });
    const mobileButton = mobileList.locator('button[aria-controls$="-mobile-offenses"]').first();
    await expect(mobileButton).toHaveText('Show all 4 offenses');
    await mobileButton.click();
    await expect(mobileButton).toBeFocused();
    await expectNoPageOverflow(page);
    await expectAccessible(
        page,
        '[id^="subpoena-review-"][id$="-mobile-offenses"], button[aria-controls^="subpoena-review-"][aria-controls$="-mobile-offenses"]',
    );
});

test('Resolution Review queue retains compact collections and row-navigation contract', async ({
    page,
}) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, 'e2e_admin', '/dashboard');
    await page.goto('/cases');
    const casesReference = await caseCellPresentation(
        page.getByRole('region', { name: 'Cases table' }).locator('tbody tr').first(),
    );
    await interceptInertiaPage(page, '/resolution-reviews', (payload) => {
        const resolutions = queue(payload, 'resolutions');
        if (resolutions) projectResolutionQueue(resolutions);
    });
    await page.getByRole('link', { name: 'Resolution Review' }).click();

    const tableRegion = page.getByRole('region', { name: 'Resolution Review table' });
    const firstRow = tableRegion.locator('tbody tr').first();
    const button = firstRow.locator('button[aria-controls$="-desktop-offenses"]');
    const rowLink = firstRow.getByRole('link', { name: /^Review Resolution for case / });
    const href = await rowLink.getAttribute('href');
    const currentUrl = page.url();

    expectCaseCellPresentation(casesReference, await caseCellPresentation(firstRow));
    await expect(
        tableRegion.getByRole('columnheader', { name: 'Case', exact: true }),
    ).toBeVisible();
    await expect(tableRegion.getByRole('columnheader', { name: 'Docket No.' })).toHaveCount(0);
    await expect(tableRegion.getByRole('columnheader', { name: 'Crimes' })).toHaveCount(0);
    await expect(button).toHaveText('Show all 4 offenses');
    await button.focus();
    await button.press('Enter');
    await expect(button).toBeFocused();
    await expect(page).toHaveURL(currentUrl);
    await expect(firstRow.locator('[id$="-desktop-offenses"] li')).toHaveText(longOffenses);
    await expectNoPageOverflow(page);

    await page.setViewportSize({ width: 375, height: 812 });
    const mobileList = page.getByRole('region', { name: 'Resolution Review list' });
    const mobileButton = mobileList.locator('button[aria-controls$="-mobile-offenses"]');
    await expect(mobileButton).toHaveText('Show all 4 offenses');
    await mobileButton.press('Space');
    await expect(mobileButton).toHaveAttribute('aria-expanded', 'true');
    await expectNoPageOverflow(page);
    await expectAccessible(
        page,
        '[id^="resolution-review-"][id$="-mobile-offenses"], button[aria-controls^="resolution-review-"][aria-controls$="-mobile-offenses"]',
    );

    await page.setViewportSize({ width: 1440, height: 900 });
    expect(href).toMatch(/^\/resolution-reviews\/[0-9a-f-]+$/);
    await expect(rowLink).toBeVisible();
});
