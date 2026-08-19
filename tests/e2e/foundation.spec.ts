import { test, expect } from '@playwright/test'

test.describe('Platform Foundation', () => {
  test('home page loads with platform branding', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/WebinarPlatform/i)
    await expect(page.getByRole('heading', { name: /Live Learning, Reimagined/i })).toBeVisible()
  })

  test('admin link is present on home page', async ({ page }) => {
    await page.goto('/')
    const adminLink = page.locator('a[href="/admin"]')
    await expect(adminLink).toBeVisible()
  })

  test('admin dashboard loads after login', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.locator('#login-email')).toBeVisible({ timeout: 10000 })
    await page.fill('#login-email', 'admin@kravemicrogreens.in')
    await page.fill('#login-password', 'ChangeMe123!')
    await page.click('#login-submit')
    await expect(page).toHaveURL('/admin', { timeout: 10000 })
    await expect(page.locator('header').getByText('Vendor Admin')).toBeVisible()
  })

  test('404 page shows for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible()
    const backLink = page.getByRole('link', { name: /back to home/i })
    await expect(backLink).toBeVisible()
  })

  test('back to home link navigates correctly', async ({ page }) => {
    await page.goto('/not-a-real-page')
    await page.getByRole('link', { name: /back to home/i }).click()
    await expect(page).toHaveURL('/')
  })

  test('admin sidebar navigation is visible after login', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.locator('#login-email')).toBeVisible({ timeout: 10000 })
    await page.fill('#login-email', 'admin@kravemicrogreens.in')
    await page.fill('#login-password', 'ChangeMe123!')
    await page.click('#login-submit')
    await expect(page).toHaveURL('/admin', { timeout: 10000 })
    await expect(page.getByRole('link', { name: /Webinars/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Leads/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Analytics/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Branding/i })).toBeVisible()
  })
})
