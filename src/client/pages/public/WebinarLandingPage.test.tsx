import { describe, it, expect, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import WebinarLandingPage from './WebinarLandingPage'
import { api } from '../../lib/api'

vi.mock('../../lib/api', () => ({
  api: {
    landing: {
      getFeatured: vi.fn(),
      getPublicConfig: vi.fn(),
    },
    branding: {
      getPublic: vi.fn().mockResolvedValue({ ok: true, data: { platformName: 'Krave Microgreens' } }),
    },
    trainer: {
      getPublic: vi.fn().mockResolvedValue({ ok: true, data: { full_name: 'Trainer' } }),
    },
  },
}))

describe('WebinarLandingPage', () => {
  it('renders landing page when webinar is active', async () => {
    const mockWebinar = {
      id: '01M0T506J4DEWH8XA20P7WPH3Z',
      title: 'Krave Microgreens 101',
      description: 'Learn to grow microgreens',
      hostName: 'Chef Venkat',
      startDate: '2026-08-25',
      startTime: '10:00',
      endTime: '11:30',
      timezone: 'IST',
      status: 'PUBLISHED',
      maxParticipants: 300,
      registrationOpen: true,
      spotsLeft: 299,
      isFull: false,
      isLive: false,
    }

    vi.mocked(api.landing.getFeatured).mockResolvedValueOnce({
      ok: true,
      data: {
        webinar: mockWebinar,
        trainer: { full_name: 'Chef Venkat', bio: 'Expert' } as any,
        landingConfig: {} as any,
      },
    } as any)

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <WebinarLandingPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(container.textContent).toContain('Krave Microgreens 101')
    })
  })

  it('renders fallback screen when no webinar is active', async () => {
    vi.mocked(api.landing.getFeatured).mockResolvedValueOnce({
      ok: true,
      data: {
        webinar: null,
        trainer: null,
        landingConfig: {
          fallback_redirect_url: 'https://kravemicrogreens.in',
          fallback_redirect_secs: 5,
          fallback_title: 'No Live Webinar Scheduled At The Moment',
        } as any,
      },
    } as any)

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <WebinarLandingPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(container.textContent).toContain('No Live Webinar Scheduled At The Moment')
    })
  })
})
