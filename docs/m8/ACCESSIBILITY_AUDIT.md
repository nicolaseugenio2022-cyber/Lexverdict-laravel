# Accessibility Audit

## Automated Coverage

- Tool: Playwright with axe-core
- Viewport: 375 x 812
- Pages: Staff Login, Case Lookup, Administrator Dashboard, filtered Case Report, User Action Logs
- Result: zero automatic axe violations after correcting disabled pagination contrast.

## Interaction Coverage

- Visible labels and native keyboard-operable inputs/selects.
- Minimum 44-pixel action targets.
- Visible focus rings.
- Report charts retain count/percentage text and tabular equivalents.
- Wide audit data is contained in an explicit horizontal-scroll region on narrow screens.
- Role navigation and logout were exercised with keyboard-accessible semantic links/buttons.

Automated checks do not replace stakeholder testing with assistive technologies. The UAT plan includes keyboard and screen-reader confirmation.
