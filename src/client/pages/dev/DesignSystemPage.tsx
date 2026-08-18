import React, { useState } from 'react'
import { ThemePreview } from '../../components/ui/ThemePreview'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Drawer } from '../../components/ui/Drawer'
import { Tabs, TabList, Tab, TabPanel } from '../../components/ui/Tabs'
import { useToast, ToastProvider } from '../../components/ui/Toast'
import { Input } from '../../components/ui/Input'
import { PhoneInput } from '../../components/ui/PhoneInput'
import { CountrySelect } from '../../components/ui/CountrySelect'
import { Textarea } from '../../components/ui/Textarea'
import { Checkbox, RadioGroup } from '../../components/ui/Checkbox'
import { StarRating } from '../../components/ui/StarRating'
import { Table } from '../../components/ui/Table'
import { Pagination } from '../../components/ui/Pagination'
import { Dropdown } from '../../components/ui/Dropdown'

/**
 * DesignSystemPage
 *
 * Dev-only component showcase for all UI primitives.
 * Route: /design-system (development only)
 */
export default function DesignSystemPage() {
  return (
    <ToastProvider>
      <DesignSystemInner />
    </ToastProvider>
  )
}

function DesignSystemInner() {
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('')
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')
  const [page, setPage] = useState(1)
  const [agreed, setAgreed] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--color-primary)', color: 'white',
        padding: 'var(--space-6) var(--space-8)',
      }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)', fontWeight: 900, margin: 0 }}>
          🌱 Design System
        </h1>
        <p style={{ margin: '4px 0 0', opacity: 0.8, fontSize: 'var(--text-sm)' }}>
          Phase 2 — Component Library · KraveFresh Theme
        </p>
      </div>

      <div style={{ padding: 'var(--space-8)', maxWidth: 1100, margin: '0 auto' }}>
        <Tabs defaultTab="showcase">
          <TabList>
            <Tab id="showcase">Theme Showcase</Tab>
            <Tab id="interactive">Interactive</Tab>
            <Tab id="forms">Forms</Tab>
            <Tab id="data">Data</Tab>
          </TabList>

          <TabPanel id="showcase">
            <ThemePreview />
          </TabPanel>

          <TabPanel id="interactive">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>

              {/* Modal */}
              <Section title="Modal">
                <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
                <Modal
                  open={modalOpen}
                  onClose={() => setModalOpen(false)}
                  title="Confirm Registration"
                  description="Please verify your details before confirming."
                  footer={
                    <>
                      <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                      <Button onClick={() => { setModalOpen(false); toast({ title: 'Registered!', variant: 'success' }) }}>Confirm</Button>
                    </>
                  }
                >
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                    You are registering for the Microgreens Masterclass webinar on January 15, 2025 at 6:00 PM IST.
                  </p>
                </Modal>
              </Section>

              {/* Drawer */}
              <Section title="Drawer">
                <Button variant="outline" onClick={() => setDrawerOpen(true)}>Open Drawer</Button>
                <Drawer
                  open={drawerOpen}
                  onClose={() => setDrawerOpen(false)}
                  title="Participant Details"
                  footer={<Button fullWidth onClick={() => setDrawerOpen(false)}>Close</Button>}
                >
                  <p style={{ color: 'var(--color-muted)', fontSize: 'var(--text-sm)' }}>
                    Drawer content here. In Phase 9+ this will show participant registration details.
                  </p>
                </Drawer>
              </Section>

              {/* Toast */}
              <Section title="Toast Notifications">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button size="sm" variant="outline" onClick={() => toast({ title: 'Default notification', description: 'This is a default toast.' })}>Default</Button>
                  <Button size="sm" variant="outline" onClick={() => toast({ title: 'Success!', description: 'Your changes have been saved.', variant: 'success' })}>Success</Button>
                  <Button size="sm" variant="outline" onClick={() => toast({ title: 'Warning', description: 'Approaching rate limit.', variant: 'warning' })}>Warning</Button>
                  <Button size="sm" variant="outline" onClick={() => toast({ title: 'Error', description: 'Failed to save. Please retry.', variant: 'error' })}>Error</Button>
                  <Button size="sm" variant="outline" onClick={() => toast({ title: 'Info', description: 'Webinar starts in 5 minutes.', variant: 'info' })}>Info</Button>
                </div>
              </Section>

              {/* Dropdown */}
              <Section title="Dropdown">
                <Dropdown
                  trigger={<Button variant="outline" size="sm">Actions ▾</Button>}
                  items={[
                    { label: 'Edit', icon: '✏️', onClick: () => toast({ title: 'Edit clicked', variant: 'info' }) },
                    { label: 'Duplicate', icon: '📋', onClick: () => toast({ title: 'Duplicated!', variant: 'success' }) },
                    { separator: true },
                    { label: 'Delete', icon: '🗑️', danger: true, onClick: () => toast({ title: 'Deleted', variant: 'error' }) },
                  ]}
                />
              </Section>
            </div>
          </TabPanel>

          <TabPanel id="forms">
            <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <Input label="Full Name" placeholder="Priya Sharma" required hint="As shown on government ID" />
              <Input label="Email" type="email" placeholder="priya@example.com" required error="Please enter a valid email" />
              <PhoneInput label="Phone Number" value={phone} onChange={(e164) => setPhone(e164)} required hint="We will send webinar access via WhatsApp" />
              <CountrySelect label="Country" value={country} onChange={(code) => setCountry(code)} required />
              <Textarea label="Your Question" value={note} onChange={(e) => setNote(e.target.value)} showCount maxLength={200} hint="We will answer this live during the Q&A" />
              <RadioGroup
                name="interest"
                label="I am interested in"
                options={[
                  { value: 'offline_training', label: 'Offline Training' },
                  { value: 'online_training', label: 'Online Training' },
                  { value: 'franchise', label: 'Franchise Opportunity' },
                ]}
              />
              <Checkbox
                label="I agree to receive updates and marketing communications"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <StarRating label="Rate this webinar" value={rating} onChange={setRating} size="lg" />
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)' }}>Phone (E.164): {phone || '—'} · Country: {country || '—'}</p>
            </div>
          </TabPanel>

          <TabPanel id="data">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <Table
                columns={[
                  { key: 'name', header: 'Name', sortable: true },
                  { key: 'country', header: 'Country' },
                  { key: 'registered', header: 'Registered', align: 'right' },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) => (
                      <span style={{ color: row.status === 'Attended' ? 'var(--color-success)' : 'var(--color-muted)' }}>
                        {String(row.status)}
                      </span>
                    ),
                  },
                ]}
                data={SAMPLE_DATA}
              />
              <Pagination page={page} totalPages={8} onPageChange={setPage} />
            </div>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)', color: 'var(--color-text)' }}>{title}</h3>
      {children}
    </div>
  )
}

const SAMPLE_DATA = [
  { id: '1', name: 'Priya Sharma', country: '🇮🇳 India', registered: 'Jan 10', status: 'Attended' },
  { id: '2', name: 'John Smith', country: '🇺🇸 USA', registered: 'Jan 11', status: 'Registered' },
  { id: '3', name: 'Aisha Khan', country: '🇦🇪 UAE', registered: 'Jan 12', status: 'Attended' },
  { id: '4', name: 'Carlos Ruiz', country: '🇬🇧 UK', registered: 'Jan 12', status: 'Registered' },
  { id: '5', name: 'Wei Chen', country: '🇸🇬 Singapore', registered: 'Jan 13', status: 'Attended' },
]
