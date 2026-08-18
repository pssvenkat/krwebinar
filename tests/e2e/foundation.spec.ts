import { test, expect } from '@playwright/test'

/**
 * Phase 1 — Foundation smoke tests
 *
 * These tests verify the basic application shell is working.
 * Full E2E journey tests will be added in Phase 24.
 */

test.describe('Platform Foundation', () => {
  test('home page loads with platform branding', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/WebinarPlatform/i)
    await expect(page.getByText('WebinarPlatform')).toBeVisible()
    await expect(page.getByText('Live Learning, Reimagined')).toBeVisible()
  })

  test('admin link is present on home page', async ({ page }) => {
    await page.goto('/')
    const adminLink = page.getByRole('link', { name: /admin dashboard/i })
    await expect(adminLink).toBeVisible()
  })

  test('admin dashboard loads', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Platform Status')).toBeVisible()
  })

  test('404 page shows for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    await expect(page.getByText('Page Not Found')).toBeVisible()
    const backLink = page.getByRole('link', { name: /back to home/i })
    await expect(backLink).toBeVisible()
  })

  test('back to home link navigates correctly', async ({ page }) => {
    await page.goto('/not-a-real-page')
    await page.getByRole('link', { name: /back to home/i }).click()
    await expect(page).toHaveURL('/')
  })

  test('admin sidebar navigation is visible', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByText('Webinars')).toBeVisible()
    await expect(page.getByText('Leads')).toBeVisible()
    await expect(page.getByText('Analytics')).toBeVisible()
    await expect(page.getByText('Branding')).toBeVisible()
  })
})
