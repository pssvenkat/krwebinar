import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'
import { Badge } from './Badge'
import { Input } from './Input'
import { Checkbox } from './Checkbox'
import { StarRating } from './StarRating'
import { Progress } from './Progress'
import { Avatar } from './Avatar'
import { EmptyState, LoadingState, ErrorState } from './States'
import { Alert } from './Alert'
import { Pagination } from './Pagination'

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('is disabled when loading', () => {
    render(<Button loading>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
  })

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('calls onClick handler', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" placeholder="Enter email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('shows error message', () => {
    render(<Input label="Email" error="Invalid email" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email')
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows hint when no error', () => {
    render(<Input label="Name" hint="As on ID" />)
    expect(screen.getByText('As on ID')).toBeInTheDocument()
  })

  it('shows required indicator', () => {
    render(<Input label="Name" required />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })
})

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders with dot', () => {
    const { container } = render(<Badge dot>Live</Badge>)
    expect(container.querySelector('.badge-dot')).toBeInTheDocument()
  })
})

describe('Checkbox', () => {
  it('renders with label', () => {
    render(<Checkbox label="I agree" />)
    expect(screen.getByLabelText('I agree')).toBeInTheDocument()
  })

  it('can be checked and unchecked', () => {
    const onChange = vi.fn()
    render(<Checkbox label="Accept" onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalled()
  })

  it('shows error', () => {
    render(<Checkbox label="Consent" error="Required" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Required')
  })
})

describe('StarRating', () => {
  it('renders correct number of stars', () => {
    render(<StarRating max={5} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(5)
  })

  it('calls onChange when star clicked', () => {
    const onChange = vi.fn()
    render(<StarRating onChange={onChange} max={5} />)
    fireEvent.click(screen.getAllByRole('button')[2]) // 3rd star
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('does not call onChange in readonly mode', () => {
    const onChange = vi.fn()
    render(<StarRating onChange={onChange} readonly value={3} />)
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('Progress', () => {
  it('renders with correct aria attributes', () => {
    render(<Progress value={60} max={100} label="Completion" />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '60')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('clamps value to 0–100 percent', () => {
    const { container } = render(<Progress value={150} max={100} />)
    const fill = container.querySelector('.progress-fill') as HTMLElement
    expect(fill.style.width).toBe('100%')
  })

  it('shows percentage when showValue is true', () => {
    render(<Progress value={75} showValue />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })
})

describe('Avatar', () => {
  it('renders initials from name', () => {
    render(<Avatar name="Priya Sharma" />)
    expect(screen.getByText('PS')).toBeInTheDocument()
  })

  it('renders single initial for single name', () => {
    render(<Avatar name="Priya" />)
    expect(screen.getByText('P')).toBeInTheDocument()
  })

  it('renders image when src is provided', () => {
    render(<Avatar name="Test User" src="https://example.com/avatar.jpg" />)
    expect(screen.getByAltText('Avatar of Test User')).toBeInTheDocument()
  })
})

describe('States', () => {
  it('EmptyState renders title and icon', () => {
    render(<EmptyState icon="📭" title="No webinars" description="Create your first webinar." />)
    expect(screen.getByText('No webinars')).toBeInTheDocument()
    expect(screen.getByText('Create your first webinar.')).toBeInTheDocument()
  })

  it('LoadingState renders accessible label', () => {
    render(<LoadingState label="Loading registrations…" />)
    expect(screen.getByRole('status', { name: 'Loading registrations…' })).toBeInTheDocument()
  })

  it('ErrorState renders with error message', () => {
    render(<ErrorState title="Failed to load" error="Network error" />)
    expect(screen.getByText('Failed to load')).toBeInTheDocument()
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })
})

describe('Alert', () => {
  it('renders title and children', () => {
    render(<Alert title="Info" variant="info">Details here</Alert>)
    expect(screen.getByText('Info')).toBeInTheDocument()
    expect(screen.getByText('Details here')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<Alert onClose={onClose}>Alert message</Alert>)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss alert' }))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('Pagination', () => {
  it('renders page buttons', () => {
    render(<Pagination page={3} totalPages={10} onPageChange={vi.fn()} />)
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
  })

  it('calls onPageChange with correct page', () => {
    const onChange = vi.fn()
    render(<Pagination page={1} totalPages={5} onPageChange={onChange} showEdges={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('disables previous on first page', () => {
    render(<Pagination page={1} totalPages={5} onPageChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  })

  it('disables next on last page', () => {
    render(<Pagination page={5} totalPages={5} onPageChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('returns null when only 1 page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })
})
