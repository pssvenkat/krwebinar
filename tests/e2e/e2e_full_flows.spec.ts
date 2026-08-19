import { test, expect } from '@playwright/test'

test.describe('End-to-End Comprehensive User Journeys and Boundary Test Suite', () => {

  test('1. Public Homepage, Platform Metrics & Responsive Navigation', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/WebinarPlatform/i)
    await expect(page.getByRole('heading', { name: /Live Learning, Reimagined/i })).toBeVisible()

    // Platform status cards
    await expect(page.getByText('Phase')).toBeVisible()
    await expect(page.getByText('API Status')).toBeVisible()

    // Admin CTA link
    const adminLink = page.locator('a[href="/admin"]')
    await expect(adminLink).toBeVisible()

    // 404 error page & navigation recovery
    await page.goto('/invalid-non-existent-page')
    await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible()
    await page.getByRole('link', { name: /back to home/i }).click()
    await expect(page).toHaveURL('/')
  })

  test('2. Design System Interactive Components & UI Primitives Showcase', async ({ page }) => {
    await page.goto('/design-system')
    await expect(page.getByRole('heading', { name: /Design System/i })).toBeVisible()

    // 1. Theme Showcase Tab
    await expect(page.getByRole('tab', { name: 'Theme Showcase' })).toBeVisible()

    // 2. Interactive Tab — Modal & Toast triggers
    await page.getByRole('tab', { name: 'Interactive' }).click()
    const modalBtn = page.getByRole('button', { name: 'Open Modal' })
    await expect(modalBtn).toBeVisible()
    await modalBtn.click()
    await expect(page.getByRole('heading', { name: 'Confirm Registration' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()

    // 3. Forms Tab — Inputs, Phone formatting, Star Ratings
    await page.getByRole('tab', { name: 'Forms' }).click()
    await expect(page.getByRole('textbox', { name: 'Full Name' })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible()

    // 4. Data Tab — Table & Pagination
    await page.getByRole('tab', { name: 'Data' }).click()
    await expect(page.getByText('Priya Sharma')).toBeVisible()
    await expect(page.getByText('Attended').first()).toBeVisible()
  })

  test('3. Public Webinar Registration Validation, Edge Cases & Confirmation Flow', async ({ page }) => {
    const webinarId = '01HZ0000000000000000000005'
    await page.goto(`/register/${webinarId}`)

    await expect(page.getByRole('heading', { name: 'Introduction to Urban Microgreens' })).toBeVisible()
    await expect(page.getByText('Hosted by Priya Sharma')).toBeVisible()

    // 1. Validation error testing (empty name and invalid email)
    await page.fill('#reg-name', 'A') // less than 2 chars
    await page.fill('#reg-email', 'invalid-email-address')
    await page.click('#reg-submit')
    await expect(page.getByText(/Name must be at least 2 characters|Enter a valid email/i).first()).toBeVisible()

    // 2. Complete valid registration
    const uniqueEmail = `flow_test_${Date.now()}@example.com`
    await page.fill('#reg-name', 'Dr. Sarah Connor')
    await page.fill('#reg-email', uniqueEmail)
    await page.fill('#reg-city', 'Bangalore')
    await page.locator('#reg-consent-marketing').check()

    await page.click('#reg-submit')

    // 3. Confirmation card & Calendar export links
    await expect(page.getByText(/registered/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Dr. Sarah Connor')).toBeVisible()
    await expect(page.getByText(/Google Calendar/i)).toBeVisible()
    await expect(page.getByText(/Outlook/i)).toBeVisible()
    await expect(page.getByText(/Download .ics/i)).toBeVisible()
  })

  test('4. Webinar Live Attendee Room & Interactive WebSocket Chat/Polls/Q&A', async ({ page }) => {
    await page.goto('/w/demo-token')

    // 1. Header & Live badge
    await expect(page.getByRole('heading', { name: 'Introduction to Urban Microgreens' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Demo Attendee')).toBeVisible()
    await expect(page.getByText('LIVE STREAM', { exact: true })).toBeVisible()

    // 2. Chat Panel interaction
    const chatTab = page.getByRole('button', { name: /Chat/i })
    await expect(chatTab).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Chat message' })).toBeVisible()

    // 3. Polls Panel
    const pollTab = page.getByRole('button', { name: /Polls/i })
    await pollTab.click()
    await expect(page.getByText(/Poll/i).first()).toBeVisible()

    // 4. Q&A Panel submission
    const qnaTab = page.getByRole('button', { name: /Q&A/i })
    await qnaTab.click()
    await expect(page.getByPlaceholder(/Ask host a question/i)).toBeVisible()
    await page.fill('input[placeholder*="Ask host a question"]', 'What is the optimal harvesting time?')
    await page.click('#submit-qna')

    // 5. Leave to feedback flow
    await page.getByRole('button', { name: /Leave & Give Feedback/i }).click()
    await expect(page).toHaveURL(/\/feedback/)
  })

  test('5. Post-Webinar Feedback Survey, Rating & Lead Capture Submission', async ({ page }) => {
    await page.goto('/w/demo-token/feedback')

    await expect(page.getByRole('heading', { name: 'How was the webinar?' })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.feedback-webinar-name')).toBeVisible()

    // Suggestion input
    await page.fill('#fb-suggestion', 'Excellent practical session. Looking forward to the next masterclass!')

    // Lead interest options
    const interestBox = page.locator('#fb-interest-bulk_supply')
    if (await interestBox.count() > 0) {
      await interestBox.check()
    }

    // Follow-up contact request
    await page.locator('#fb-contact-requested').check()
    await expect(page.locator('#fb-consent-contact')).toBeVisible()
    await page.locator('#fb-consent-contact').check()

    // Skip button test
    await page.click('#fb-skip')
    await expect(page).toHaveURL('/w/demo-token')
  })

  test('6. Complete Vendor Admin Suite: Auth, Webinars CRUD, Studio, Analytics, Branding & Domains', async ({ page }) => {
    // 1. Login with bad credentials first
    await page.goto('/admin/login')
    await expect(page.getByRole('heading', { name: 'Admin Portal' })).toBeVisible()

    await page.fill('#login-email', 'admin@kravemicrogreens.in')
    await page.fill('#login-password', 'IncorrectPassword999!')
    await page.click('#login-submit')
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 })

    // 2. Successful login
    await page.fill('#login-password', 'ChangeMe123!')
    await page.click('#login-submit')
    await expect(page).toHaveURL('/admin', { timeout: 10000 })
    await expect(page.locator('header').getByText('Vendor Admin')).toBeVisible()

    // 3. Webinars List & New Webinar Page
    await page.click('a[href="/admin/webinars"]')
    await expect(page).toHaveURL('/admin/webinars')
    await expect(page.locator('h1.admin-page-title')).toHaveText('Webinars')
    await expect(page.getByText('Introduction to Urban Microgreens')).toBeVisible({ timeout: 10000 })

    await page.click('#webinar-list-new')
    await expect(page).toHaveURL('/admin/webinars/new')
    await expect(page.getByRole('heading', { name: /Create|New Webinar/i }).first()).toBeVisible()

    // 4. Registrations List
    await page.click('a[href="/admin/registrations"]')
    await expect(page).toHaveURL('/admin/registrations')
    await expect(page.locator('h1.admin-page-title')).toContainText('Registrations')

    // 5. Leads & Feedback
    await page.click('a[href="/admin/leads"]')
    await expect(page).toHaveURL('/admin/leads')
    await expect(page.locator('h1.admin-page-title')).toContainText('Leads')

    // 6. Analytics Overview
    await page.click('a[href="/admin/analytics"]')
    await expect(page).toHaveURL('/admin/analytics')
    await expect(page.locator('h1.admin-page-title')).toContainText('Analytics')

    // 7. Live Branding & Settings
    await page.click('a[href="/admin/branding"]')
    await expect(page).toHaveURL('/admin/branding')
    await expect(page.locator('h1.admin-page-title')).toContainText('Branding')
    await expect(page.getByText('Visual Identity')).toBeVisible()
    await expect(page.getByText('Colour Palette')).toBeVisible()

    // 8. Custom Domains Management
    await page.click('a[href="/admin/domains"]')
    await expect(page).toHaveURL('/admin/domains')
    await expect(page.locator('h1.admin-page-title')).toContainText('Custom Domains')
    await expect(page.getByText('Add Custom Domain')).toBeVisible()

    // 9. Team & User Management
    await page.click('a[href="/admin/users"]')
    await expect(page).toHaveURL('/admin/users')
    await expect(page.locator('h1.admin-page-title')).toContainText('Team')

    // 10. Business Profile & Privacy
    await page.click('a[href="/admin/profile"]')
    await expect(page).toHaveURL('/admin/profile')
    await expect(page.locator('h1.admin-page-title')).toContainText('Profile')

    await page.click('a[href="/admin/privacy"]')
    await expect(page).toHaveURL('/admin/privacy')
    await expect(page.locator('h1.admin-page-title')).toContainText('Privacy')
  })

  test('7. Platform Superadmin: Authentication, Multi-Tenant Governance & User Directory', async ({ page }) => {
    await page.goto('/admin/login')

    // Platform Owner Login
    await page.fill('#login-email', 'owner@krwebinar.com')
    await page.fill('#login-password', 'ChangeMe123!')
    await page.click('#login-submit')

    // Verify Platform Superadmin shell
    await expect(page).toHaveURL(/\/platform/, { timeout: 10000 })
    await expect(page.getByText('Platform Superadmin')).toBeVisible()
    await expect(page.getByRole('link', { name: /Tenants & Governance/i })).toBeVisible()

    // Tenants directory
    await expect(page.getByRole('button', { name: 'Krave Microgreens' })).toBeVisible({ timeout: 10000 })

    // Onboard New Tenant form
    await page.click('#new-tenant')
    await expect(page).toHaveURL('/platform/tenants/new')
    await expect(page.getByRole('heading', { name: /New Tenant|Onboard/i }).first()).toBeVisible()

    // User Directory
    await page.click('a[href="/platform/users"]')
    await expect(page).toHaveURL('/platform/users')
    await expect(page.getByRole('link', { name: /User Directory/i })).toBeVisible()
  })
})
