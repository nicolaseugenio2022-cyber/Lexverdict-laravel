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
    await expect(page).toHaveURL(/\/login$/);
}

async function expectAssociatedError(control: Locator, errorId: string) {
    await expect(control).toHaveAttribute('aria-invalid', 'true');
    await expect(control).toHaveAttribute('aria-describedby', errorId);
    await expect(control.page().locator(`#${errorId}[role="alert"]`)).toBeVisible();
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
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
}

test('User validation errors are associated with stable controls', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, 'e2e_admin', '/dashboard');
    await page.goto('/admin/users/create');

    const username = page.getByLabel('Username');
    await expect(username).not.toHaveAttribute('aria-invalid');
    await expect(username).not.toHaveAttribute('aria-describedby');
    await username.focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Password')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Role')).toBeFocused();

    await page.getByRole('button', { name: 'Save' }).click();

    await expectAssociatedError(username, 'user-username-error');
    await expectAssociatedError(page.getByLabel('Password'), 'user-password-error');
    await expectAssociatedError(page.getByLabel('First Name'), 'user-first-name-error');
    await expectAssociatedError(page.getByLabel('Last Name'), 'user-last-name-error');
    await expectNoSeriousAccessibilityViolations(page);
});

test('Case validation errors identify repeated party, address, and Crime controls', async ({
    page,
}) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await login(page, 'e2e_secretary', '/cases');
    await page.goto('/cases/create');

    const firstNames = page.getByLabel('First Name');
    await expect(firstNames).toHaveCount(2);
    expect(
        await firstNames.evaluateAll((controls) => controls.map((control) => control.id)),
    ).toEqual(['case-party-0-first-name', 'case-party-1-first-name']);

    await page.getByRole('button', { name: 'Create Case' }).click();

    await expectAssociatedError(page.getByLabel('Police Station'), 'case-police-station-error');
    await expect(page.getByLabel('Search Crime')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Search Crime')).toHaveAttribute(
        'aria-describedby',
        'crime-selection-help crime-selection-error',
    );
    await expect(page.locator('#crime-selection-error[role="alert"]')).toBeVisible();
    await expectAssociatedError(firstNames.first(), 'case-party-0-first-name-error');
    await expectAssociatedError(page.getByLabel('Region').first(), 'case-party-0-region-error');
    await expectAssociatedError(page.getByLabel('Barangay').first(), 'case-party-0-barangay-error');
    await expectAssociatedError(page.getByLabel('Street').first(), 'case-party-0-street-error');
    await expectNoSeriousAccessibilityViolations(page);
});

test('Resolution Court validation remains associated after the approved workflow transition', async ({
    page,
}) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, 'e2e_prosecutor', '/subpoena-reviews');

    const reviewLink = page.getByRole('link', { name: 'Review', exact: true }).first();
    await reviewLink.click();
    await page.getByRole('button', { name: 'Approve Subpoena' }).click();
    const confirmation = page.getByRole('alertdialog', { name: 'Approve Subpoena' });
    await confirmation.getByRole('button', { name: 'Approve Subpoena' }).click();
    await expect(page.getByText('Approved', { exact: true }).first()).toBeVisible();

    await logout(page);
    await login(page, 'e2e_secretary', '/cases');
    await page.getByRole('link', { name: 'Resolve', exact: true }).first().click();

    const court = page.getByLabel('Court');
    await expect(court).not.toHaveAttribute('aria-invalid');
    await court.evaluate((control) => control.removeAttribute('required'));
    await page.getByRole('button', { name: 'Submit Resolution' }).click();

    await expectAssociatedError(court, 'resolution-court-error');
    await expectNoSeriousAccessibilityViolations(page);
});

test('Crime validation errors remain associated with the inline catalog form', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page, 'e2e_admin', '/dashboard');
    await page.goto('/admin/offenses');

    const crimeName = page.getByLabel('Crime Name');
    await crimeName.fill('Qualified Theft');
    await page.getByRole('button', { name: 'Add Crime' }).click();

    await expectAssociatedError(crimeName, 'crime-name-error');
    await expectNoSeriousAccessibilityViolations(page);
});
