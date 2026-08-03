import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type Route } from '@playwright/test';

const password = 'E2E-only-password';

async function login(page: Page, username: string, landing: string) {
    await page.goto('/login');
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL((url) => url.pathname === landing);
}

async function holdRequest(page: Page, method: string, pathname: string | RegExp) {
    let releaseRequest: () => void = () => {};
    let markSeen: () => void = () => {};
    let requestCount = 0;
    const release = new Promise<void>((resolve) => {
        releaseRequest = resolve;
    });
    const seen = new Promise<void>((resolve) => {
        markSeen = resolve;
    });
    const handler = async (route: Route) => {
        const request = route.request();
        const requestPath = new URL(request.url()).pathname;
        const matchesPath =
            typeof pathname === 'string' ? requestPath === pathname : pathname.test(requestPath);

        if (request.method() !== method || !matchesPath) {
            await route.continue();
            return;
        }

        requestCount += 1;
        markSeen();
        if (requestCount === 1) await release;
        await route.continue();
    };

    await page.route('**/*', handler);

    return {
        seen,
        release: releaseRequest,
        count: () => requestCount,
        dispose: () => page.unroute('**/*', handler),
    };
}

async function expectProcessing(
    form: Locator,
    submit: Locator,
    label: string,
    requestCount: () => number,
) {
    await expect(form).toHaveAttribute('aria-busy', 'true');
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveText(label);
    await submit.evaluate((button) => (button as HTMLButtonElement).click());
    await expect.poll(requestCount).toBe(1);
}

async function expectRestored(form: Locator, submit: Locator, label: string) {
    await expect(form).toHaveAttribute('aria-busy', 'false');
    await expect(submit).toBeEnabled();
    await expect(submit).toHaveText(label);
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

test('Case create and revision forms expose deterministic processing feedback', async ({
    page,
}) => {
    await login(page, 'e2e_secretary', '/cases');
    await page.goto('/cases/create');

    let form = page.locator('main form');
    let submit = form.locator('button[type="submit"]');
    let gate = await holdRequest(page, 'POST', '/cases');
    await submit.click();
    await gate.seen;
    await expectProcessing(form, submit, 'Creating...', gate.count);
    gate.release();
    await expectRestored(form, submit, 'Create Case');
    await gate.dispose();

    page.once('dialog', (dialog) => dialog.accept());
    await page.goto('/secretary/verifying-cases');
    await page.getByRole('link', { name: 'Edit', exact: true }).first().click();
    await page.getByLabel('Police Station').fill('');
    form = page.locator('main form');
    submit = form.locator('button[type="submit"]');
    gate = await holdRequest(page, 'PATCH', /^\/cases\/[0-9a-f-]+$/);
    await submit.click();
    await gate.seen;
    await expectProcessing(form, submit, 'Saving...', gate.count);
    gate.release();
    await expectRestored(form, submit, 'Save Revision');
    await gate.dispose();
    await expectNoSeriousAccessibilityViolations(page);
});

test('User create and edit forms restore their labels after validation responses', async ({
    page,
}) => {
    await login(page, 'e2e_admin', '/dashboard');
    await page.goto('/admin/users/create');

    let form = page.locator('main form');
    let submit = form.locator('button[type="submit"]');
    let gate = await holdRequest(page, 'POST', '/admin/users');
    await submit.click();
    await gate.seen;
    await expectProcessing(form, submit, 'Creating...', gate.count);
    gate.release();
    await expectRestored(form, submit, 'Save');
    await gate.dispose();

    page.once('dialog', (dialog) => dialog.accept());
    await page.goto('/admin/users');
    await page.getByRole('link', { name: 'Edit', exact: true }).first().click();
    await page.getByLabel('First Name').fill('');
    form = page.locator('main form');
    submit = form.locator('button[type="submit"]');
    gate = await holdRequest(page, 'PATCH', /^\/admin\/users\/[0-9a-f-]+$/);
    await submit.click();
    await gate.seen;
    await expectProcessing(form, submit, 'Saving...', gate.count);
    gate.release();
    await expectRestored(form, submit, 'Save');
    await gate.dispose();
});

test('Crime editor distinguishes Add, Edit, and Delete processing', async ({ page }) => {
    test.setTimeout(60_000);
    await login(page, 'e2e_admin', '/dashboard');
    await page.goto('/admin/offenses');

    const crimeName = page.getByLabel('Crime Name');
    let form = crimeName.locator('xpath=ancestor::form');
    let submit = form.locator('button[type="submit"]');
    await crimeName.fill('Qualified Theft');
    let gate = await holdRequest(page, 'POST', '/admin/offenses');
    await submit.click();
    await gate.seen;
    await expectProcessing(form, submit, 'Adding...', gate.count);
    gate.release();
    await expectRestored(form, submit, 'Add Crime');
    await gate.dispose();

    page.once('dialog', (dialog) => dialog.accept());
    await page.goto('/admin/offenses');
    const qualifiedTheft = page.getByRole('row').filter({ hasText: 'Qualified Theft' });
    await qualifiedTheft.getByRole('button', { name: 'Edit' }).click();
    const lawReference = page.getByLabel('Law Reference');
    await lawReference.evaluate((control) => control.removeAttribute('maxlength'));
    await lawReference.fill('x'.repeat(256));
    form = crimeName.locator('xpath=ancestor::form');
    submit = form.locator('button[type="submit"]');
    gate = await holdRequest(page, 'PATCH', /^\/admin\/offenses\/[0-9a-f-]+$/);
    await submit.click();
    await gate.seen;
    await expectProcessing(form, submit, 'Saving...', gate.count);
    gate.release();
    await expectRestored(form, submit, 'Save Changes');
    await gate.dispose();

    page.once('dialog', (dialog) => dialog.accept());
    await form.getByRole('button', { name: 'Cancel' }).click();
    await expect(form.getByRole('button', { name: 'Add Crime' })).toBeVisible();

    const temporaryName = `Processing Feedback Crime ${Date.now()}`;
    await crimeName.fill(temporaryName);
    await lawReference.fill('');
    await form.getByRole('button', { name: 'Add Crime' }).click();
    const temporaryRow = page.getByRole('row').filter({ hasText: temporaryName });
    await expect(temporaryRow).toBeVisible();
    await temporaryRow.getByRole('button', { name: 'Delete' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Delete Crime' });
    gate = await holdRequest(page, 'DELETE', /^\/admin\/offenses\/[0-9a-f-]+$/);
    await dialog.getByRole('button', { name: 'Delete Crime' }).click();
    await gate.seen;
    await expect(form).toHaveAttribute('aria-busy', 'false');
    await expect(form.getByRole('button', { name: 'Add Crime' })).toBeDisabled();
    await expect(form.getByRole('button', { name: 'Adding...' })).toHaveCount(0);
    await expect(form.getByRole('button', { name: 'Saving...' })).toHaveCount(0);
    gate.release();
    await expect(temporaryRow).toHaveCount(0);
    await gate.dispose();
});

test('Assignment and Swap forms report processing independently', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page, 'e2e_admin', '/dashboard');
    await page.goto('/admin/assignments');

    const assignForm = page
        .getByRole('heading', { name: 'Assign Prosecutor and Secretary' })
        .locator('xpath=ancestor::form');
    const swapForm = page
        .getByRole('heading', { name: 'Swap Assignments' })
        .locator('xpath=ancestor::form');
    const assignSubmit = assignForm.locator('button[type="submit"]');
    const swapSubmit = swapForm.locator('button[type="submit"]');

    let gate = await holdRequest(page, 'POST', '/admin/assignments');
    await assignSubmit.click();
    await gate.seen;
    await expectProcessing(assignForm, assignSubmit, 'Assigning...', gate.count);
    await expect(swapForm).toHaveAttribute('aria-busy', 'false');
    await expect(swapSubmit).toBeEnabled();
    await expect(swapSubmit).toHaveText('Swap');
    gate.release();
    await expectRestored(assignForm, assignSubmit, 'Save Assignment');
    await gate.dispose();

    gate = await holdRequest(page, 'POST', '/admin/assignments/swap');
    await swapSubmit.click();
    await gate.seen;
    await expectProcessing(swapForm, swapSubmit, 'Swapping...', gate.count);
    await expect(assignForm).toHaveAttribute('aria-busy', 'false');
    await expect(assignSubmit).toBeEnabled();
    await expect(assignSubmit).toHaveText('Save Assignment');
    await expectNoSeriousAccessibilityViolations(page);
    gate.release();
    await expectRestored(swapForm, swapSubmit, 'Swap');
    await gate.dispose();
});
