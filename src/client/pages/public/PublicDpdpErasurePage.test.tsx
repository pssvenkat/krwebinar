/**
 * Unit tests for PublicDpdpErasurePage
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PublicDpdpErasurePage from './PublicDpdpErasurePage'
import { api } from '../../lib/api'

vi.mock('../../lib/api', () => ({
  api: {
    privacy: {
      submitPublicErasureRequest: vi.fn(),
    },
  },
}))

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PublicDpdpErasurePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PublicDpdpErasurePage', () => {
  it('renders DPDP data erasure request form', () => {
    renderComponent()
    expect(screen.getByText('Data Erasure Request')).toBeDefined()
    expect(screen.getByPlaceholderText('your.name@example.com')).toBeDefined()
    expect(screen.getByText('Submit Deletion Request')).toBeDefined()
  })

  it('submits erasure request and displays confirmation screen', async () => {
    vi.mocked(api.privacy.submitPublicErasureRequest).mockResolvedValueOnce({
      ok: true,
      data: {
        message: 'Your DPDP data erasure request has been submitted successfully.',
        requestId: 'req-01JCRM0000000000',
        status: 'PENDING',
        submittedAt: '2026-08-24T12:00:00Z',
      },
    })

    renderComponent()

    const emailInput = screen.getByPlaceholderText('your.name@example.com')
    fireEvent.change(emailInput, { target: { value: 'attendee@example.com' } })

    const submitBtn = screen.getByText('Submit Deletion Request')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Erasure Request Received')).toBeDefined()
      expect(screen.getByText('req-01JCRM0000000000')).toBeDefined()
      expect(screen.getByText('Return to Homepage')).toBeDefined()
    })
  })
})
