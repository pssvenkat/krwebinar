import React from 'react'
import { Button } from './Button'
import { Badge } from './Badge'
import { Progress } from './Progress'
import { Alert } from './Alert'
import { Avatar } from './Avatar'
import { StarRating } from './StarRating'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './Card'

/**
 * ThemePreview
 *
 * Shows all design tokens and components in context.
 * Useful for:
 *  - Verifying a vendor's custom theme looks correct
 *  - Design system documentation
 *  - Admin branding preview (Phase 5)
 */
export function ThemePreview() {
  return (
    <div className="theme-preview">
      {/* Color palette */}
      <Section title="Color Palette">
        <div className="color-swatches">
          {SWATCHES.map((s) => (
            <div key={s.token} className="swatch">
              <div className="swatch-color" style={{ background: `var(${s.token})` }} />
              <div className="swatch-label">{s.name}</div>
              <div className="swatch-token">{s.token}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Typography */}
      <Section title="Typography">
        <div className="type-scale">
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-4xl)', fontWeight: 900 }}>Heading XL</p>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)', fontWeight: 800 }}>Heading LG</p>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Heading MD</p>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 700 }}>Heading SM</p>
          <p style={{ fontSize: 'var(--text-lg)' }}>Body Large — {' '}
            <span style={{ color: 'var(--color-muted)' }}>Muted variant</span></p>
          <p style={{ fontSize: 'var(--text-base)' }}>Body Regular</p>
          <p style={{ fontSize: 'var(--text-sm)' }}>Body Small</p>
          <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>LABEL / CAPTION</p>
        </div>
      </Section>

      {/* Buttons */}
      <Section title="Buttons">
        <div className="preview-row">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="accent">Accent</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <div className="preview-row" style={{ marginTop: 12 }}>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      {/* Badges */}
      <Section title="Badges">
        <div className="preview-row">
          <Badge variant="default">Default</Badge>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="success" dot>Live</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </Section>

      {/* Avatars */}
      <Section title="Avatars">
        <div className="preview-row" style={{ alignItems: 'center' }}>
          <Avatar name="Priya Sharma" size="xs" />
          <Avatar name="John Smith" size="sm" />
          <Avatar name="Aisha Khan" size="md" />
          <Avatar name="Carlos Ruiz" size="lg" />
          <Avatar name="Wei Chen" size="xl" />
        </div>
      </Section>

      {/* Progress */}
      <Section title="Progress">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
          <Progress value={25} label="Registrations" showValue />
          <Progress value={60} variant="success" label="Attendance" showValue />
          <Progress value={85} variant="warning" label="Quota usage" showValue animated />
          <Progress value={95} variant="error" label="Storage" showValue />
        </div>
      </Section>

      {/* Star Rating */}
      <Section title="Star Rating">
        <div className="preview-row">
          <StarRating value={0} readonly label="Not rated" />
          <StarRating value={3} readonly label="3 stars" />
          <StarRating value={5} readonly label="5 stars" />
        </div>
      </Section>

      {/* Alerts */}
      <Section title="Alerts">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Alert variant="info" title="Information">Your webinar will go live at 6:00 PM IST.</Alert>
          <Alert variant="success" title="Success">Registration confirmed! You&apos;ll receive details shortly.</Alert>
          <Alert variant="warning" title="Warning">Approaching 90% of monthly participant quota.</Alert>
          <Alert variant="error" title="Error">Failed to save changes. Please try again.</Alert>
        </div>
      </Section>

      {/* Cards */}
      <Section title="Cards">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <Card>
            <CardHeader>
              <CardTitle>Microgreens Masterclass</CardTitle>
              <CardDescription>Live webinar · Jan 15, 2025</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="success" dot>Live</Badge>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Farm Setup Workshop</CardTitle>
              <CardDescription>Upcoming · Feb 3, 2025</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="primary">Published</Badge>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardHeader>
              <CardTitle>Franchise Info Session</CardTitle>
              <CardDescription>Draft</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="default">Draft</Badge>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* Border radius scale */}
      <Section title="Border Radius">
        <div className="preview-row" style={{ alignItems: 'center' }}>
          {(['var(--radius-xs)', 'var(--radius-sm)', 'var(--radius-md)', 'var(--radius-lg)', 'var(--radius-xl)', 'var(--radius-full)'] as const).map((r, i) => (
            <div
              key={i}
              style={{
                width: 48 + i * 8,
                height: 48,
                background: 'var(--color-primary-light)',
                border: '2px solid var(--color-primary)',
                borderRadius: r,
              }}
            />
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="preview-section">
      <h3 className="preview-section-title">{title}</h3>
      {children}
    </div>
  )
}

const SWATCHES = [
  { token: '--color-primary', name: 'Primary' },
  { token: '--color-secondary', name: 'Secondary' },
  { token: '--color-accent', name: 'Accent' },
  { token: '--color-background', name: 'Background' },
  { token: '--color-surface', name: 'Surface' },
  { token: '--color-text', name: 'Text' },
  { token: '--color-muted', name: 'Muted' },
  { token: '--color-border', name: 'Border' },
  { token: '--color-success', name: 'Success' },
  { token: '--color-warning', name: 'Warning' },
  { token: '--color-error', name: 'Error' },
]
