import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Request, type Route } from '@playwright/test';

const password = 'E2E-only-password';

async function login(page: Page, username: string, landing: string) {
    await page.goto('/login');
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL((url) => url.pathname === landing);
}

async function expectAccessibleViewport(page: Page) {
    const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

    expect(
        results.violations.filter((violation) =>
            ['serious', 'critical'].includes(violation.impact ?? ''),
        ),
    ).toEqual([]);
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(
        await page.evaluate(() =>
            [...document.querySelectorAll<HTMLElement>('main *')].every((element) => {
                const style = window.getComputedStyle(element);

                return !(
                    element.scrollHeight > element.clientHeight + 1 &&
                    ['auto', 'scroll'].includes(style.overflowY)
                );
            }),
        ),
    ).toBe(true);
}

async function holdRequest(page: Page, urlPattern: string) {
    let releaseRequest: () => void = () => {};
    let markSeen: (request: Request) => void = () => {};
    let markHandled: () => void = () => {};
    const release = new Promise<void>((resolve) => {
        releaseRequest = resolve;
    });
    const seen = new Promise<Request>((resolve) => {
        markSeen = resolve;
    });
    const handled = new Promise<void>((resolve) => {
        markHandled = resolve;
    });
    const handler = async (route: Route) => {
        markSeen(route.request());
        await release;
        await route.abort();
        markHandled();
    };

    await page.route(urlPattern, handler);

    return {
        seen,
        release: async () => {
            releaseRequest();
            await handled;
        },
        dispose: () => page.unroute(urlPattern, handler),
    };
}

test('Subpoena review uses the shared presentation without changing decision behavior', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, 'e2e_prosecutor', '/subpoena-reviews');
    await page.getByRole('link', { name: 'Review', exact: true }).first().click();

    const main = page.locator('main');
    const summaryHeader = page.getByRole('heading', { name: 'Case Summary' }).locator('xpath=..');
    const summary = summaryHeader.locator('xpath=..');
    await expect(summaryHeader).toHaveClass(/panel-header/);
    for (const label of [
        'Current Revision Submitted By',
        'Assigned Prosecutor',
        '1st Hearing',
        '2nd Hearing',
    ]) {
        await expect(summary.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(
        main.getByText('Current submission compared with the immediately preceding revision.', {
            exact: true,
        }),
    ).toBeVisible();

    const desktopComparison = page.getByRole('region', {
        name: 'Subpoena revision comparison table',
    });
    await expect(desktopComparison).toBeVisible();
    await expect(desktopComparison.getByRole('columnheader')).toHaveCount(3);
    await expect(desktopComparison.getByRole('row')).toHaveCount(7);
    await expect(page.getByLabel('Subpoena revision comparison', { exact: true })).toBeHidden();

    const decisionSection = page.locator('section[aria-labelledby="decision-heading"]');
    await expect(decisionSection.getByRole('heading', { name: 'Review decision' })).toBeAttached();
    await expect(decisionSection.getByRole('heading', { name: 'Approve', level: 3 })).toBeVisible();
    await expect(decisionSection.getByRole('heading', { name: 'Deny', level: 3 })).toBeVisible();

    await page.getByRole('button', { name: 'Approve Subpoena' }).click();
    const confirmation = page.getByRole('alertdialog', { name: 'Approve Subpoena' });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirmation).toBeHidden();
    for (const viewport of [
        { width: 1440, height: 900 },
        { width: 768, height: 1024 },
        { width: 375, height: 812 },
    ]) {
        await page.setViewportSize(viewport);
        if (viewport.width >= 768) {
            await expect(desktopComparison).toBeVisible();
            await expect(
                page.getByLabel('Subpoena revision comparison', { exact: true }),
            ).toBeHidden();
        } else {
            await expect(desktopComparison).toBeHidden();
            await expect(page.getByLabel('Revision submission details')).toBeVisible();
            await expect(
                page.getByLabel('Subpoena revision comparison', { exact: true }),
            ).toBeVisible();
        }
        await expectAccessibleViewport(page);
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    const heldDenial = await holdRequest(page, '**/subpoena-reviews/*/deny');
    await page.getByLabel('Comment').fill('Focused presentation regression check.');
    await page.getByRole('button', { name: 'Deny Subpoena' }).click();
    const request = await heldDenial.seen;
    expect(request.method()).toBe('POST');
    expect(new URL(request.url()).pathname).toMatch(/^\/subpoena-reviews\/[0-9a-f-]+\/deny$/);
    await expect(decisionSection.locator('form').nth(1)).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('button', { name: 'Approve Subpoena' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Denying...' })).toBeDisabled();
    await heldDenial.release();
    await heldDenial.dispose();
});

test('Resolution review shares metadata, comparison, history, and responsive structure', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, 'e2e_admin', '/dashboard');
    await page.goto('/cases');
    await page.getByRole('link', { name: 'Open case III-09-INV-26G-0001' }).click();
    await page.getByRole('link', { name: 'View Resolution' }).click();
    await page.waitForURL(/\/resolutions\/[0-9a-f-]+$/);
    const resolutionId = new URL(page.url()).pathname.split('/').at(-1);
    expect(resolutionId).toBeTruthy();
    await page.goto(`/resolution-reviews/${resolutionId}`);

    const main = page.locator('main');
    await expect(main.getByRole('heading', { name: 'Case Summary' })).toBeVisible();
    for (const label of [
        'Current Revision Submitted By',
        'Assigned Prosecutor',
        'Police Station',
        'Crimes',
        'Complainants',
        'Respondents',
    ]) {
        await expect(main.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(
        main.getByText('Current submission compared with the immediately preceding revision.', {
            exact: true,
        }),
    ).toHaveCount(0);

    const desktopComparison = page.getByRole('region', {
        name: 'Resolution revision comparison table',
    });
    await expect(desktopComparison).toBeVisible();
    await expect(desktopComparison.getByRole('row')).toHaveCount(4);
    await expect(page.getByRole('heading', { name: 'Decision History' })).toBeVisible();
    const decisionHistory = page
        .getByRole('heading', { name: 'Decision History' })
        .locator('xpath=../..');
    await expect(decisionHistory.getByText('Approved', { exact: true })).toBeVisible();
    await expect(decisionHistory).toContainText('Alex Administrator');
    const historyTimestamp = decisionHistory.locator('time[datetime]').first();
    const exactTimestamp = await historyTimestamp.getAttribute('datetime');
    expect(exactTimestamp).not.toBeNull();
    await expect(historyTimestamp).toHaveAttribute('title', exactTimestamp!);

    for (const viewport of [
        { width: 1440, height: 900 },
        { width: 768, height: 1024 },
        { width: 375, height: 812 },
    ]) {
        await page.setViewportSize(viewport);
        if (viewport.width >= 768) {
            await expect(desktopComparison).toBeVisible();
            await expect(
                page.getByLabel('Resolution revision comparison', { exact: true }),
            ).toBeHidden();
        } else {
            await expect(desktopComparison).toBeHidden();
            await expect(page.getByLabel('Revision submission details')).toBeVisible();
            await expect(
                page.getByLabel('Resolution revision comparison', { exact: true }),
            ).toBeVisible();
        }
        await expectAccessibleViewport(page);
    }
});
