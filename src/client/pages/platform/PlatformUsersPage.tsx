import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { ManagedUser } from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { usePlatformTenants } from '../../hooks/usePlatformTenants'

export default function PlatformUsersPage() {
  const qc = useQueryClient()
  const { data: tenantsData } = usePlatformTenants()
  const tenants = tenantsData?.tenants ?? []

  // Load all platform users
  const { data, isLoading, error } = useQuery({
    queryKey: ['platform', 'users'],
    queryFn: async () => {
      const res = await api.platformUsers.list()
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    staleTime: 30_000,
  })

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [tenantFilter, setTenantFilter] = useState('ALL')

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'VENDOR_ADMIN',
    tenantId: '',
  })
  const [createError, setCreateError] = useState<string | null>(null)

  // Reset password modal
  const [resetModalUser, setResetModalUser] = useState<ManagedUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      setCreateError(null)
      const res = await api.platformUsers.create({
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
        tenantId: createForm.role === 'PLATFORM_OWNER' ? null : (createForm.tenantId || null),
      })
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['platform', 'users'] })
      setShowCreateModal(false)
      setCreateForm({ name: '', email: '', password: '', role: 'VENDOR_ADMIN', tenantId: '' })
    },
    onError: (err) => setCreateError(err instanceof Error ? err.message : 'Creation failed'),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: number }) => {
      const res = await api.platformUsers.update(id, { isActive: isActive === 1 ? 0 : 1 })
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['platform', 'users'] }),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!resetModalUser) return
      const res = await api.platformUsers.resetPassword(resetModalUser.id, newPassword)
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => {
      setResetSuccess('Password updated successfully!')
      setTimeout(() => {
        setResetSuccess(null)
        setResetModalUser(null)
        setNewPassword('')
      }, 1500)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm('Are you sure you want to permanently delete this user account?')) return
      const res = await api.platformUsers.delete(id)
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['platform', 'users'] }),
  })

  if (isLoading) return <LoadingState label="Loading platform users…" />
  if (error) return <ErrorState error={error as Error} />

  const users: ManagedUser[] = data?.users ?? []

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter
    const matchesTenant =
      tenantFilter === 'ALL'
        ? true
        : tenantFilter === 'PLATFORM'
        ? u.tenant_id === null
        : u.tenant_id === tenantFilter
    return matchesSearch && matchesRole && matchesTenant
  })

  // KPI calculations
  const totalUsers = users.length
  const platformOwners = users.filter((u) => u.role === 'PLATFORM_OWNER').length
  const tenantAdmins = users.filter((u) => u.role === 'VENDOR_ADMIN' || u.role === 'VENDOR_OWNER').length
  const activeUsers = users.filter((u) => u.is_active === 1).length

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Global User Directory</h1>
          <p className="admin-page-subtitle">Manage superadmins, tenant administrators, and system access</p>
        </div>
        <Button variant="primary" size="md" onClick={() => setShowCreateModal(true)}>
          + Invite / Create User
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="platform-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.5rem' }}>
        <div className="platform-kpi-card">
          <p className="platform-kpi-label">Total System Users</p>
          <p className="platform-kpi-value">{totalUsers}</p>
        </div>
        <div className="platform-kpi-card">
          <p className="platform-kpi-label">Platform Owners</p>
          <p className="platform-kpi-value">{platformOwners}</p>
        </div>
        <div className="platform-kpi-card">
          <p className="platform-kpi-label">Tenant Admins</p>
          <p className="platform-kpi-value">{tenantAdmins}</p>
        </div>
        <div className="platform-kpi-card">
          <p className="platform-kpi-label">Active Accounts</p>
          <p className="platform-kpi-value" style={{ color: 'var(--color-success)' }}>
            {activeUsers}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name or email…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: '220px',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
          }}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
          }}
        >
          <option value="ALL">All Roles</option>
          <option value="PLATFORM_OWNER">Platform Superadmin</option>
          <option value="VENDOR_ADMIN">Tenant Admin</option>
          <option value="VENDOR_OWNER">Tenant Owner</option>
          <option value="MODERATOR">Moderator</option>
          <option value="PRESENTER">Presenter</option>
        </select>
        <select
          value={tenantFilter}
          onChange={(e) => setTenantFilter(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
          }}
        >
          <option value="ALL">All Tenants</option>
          <option value="PLATFORM">Platform Staff (No Tenant)</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.slug})
            </option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User Name & Email</th>
              <th>Assigned Scope</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)' }}>
                  No users found matching the selected filters.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{u.email}</div>
                  </td>
                  <td>
                    {u.tenant_name ? (
                      <div>
                        <span style={{ fontWeight: 500 }}>{u.tenant_name}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>slug: {u.tenant_slug}</div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>🌐 Global Platform</span>
                    )}
                  </td>
                  <td>
                    <Badge
                      variant={
                        u.role === 'PLATFORM_OWNER'
                          ? 'error'
                          : u.role === 'VENDOR_ADMIN' || u.role === 'VENDOR_OWNER'
                          ? 'primary'
                          : 'default'
                      }
                    >
                      {u.role.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={u.is_active === 1 ? 'success' : 'outline'} dot={u.is_active === 1}>
                      {u.is_active === 1 ? 'Active' : 'Suspended'}
                    </Badge>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="admin-table-action-btn"
                        onClick={() => setResetModalUser(u)}
                        title="Reset user password"
                      >
                        🔑 Password
                      </button>
                      <button
                        type="button"
                        className="admin-table-action-btn"
                        onClick={() => toggleActiveMutation.mutate({ id: u.id, isActive: u.is_active })}
                        title={u.is_active === 1 ? 'Suspend account' : 'Reactivate account'}
                      >
                        {u.is_active === 1 ? 'Suspend' : 'Activate'}
                      </button>
                      {u.role !== 'PLATFORM_OWNER' && (
                        <button
                          type="button"
                          className="admin-table-action-btn admin-table-action-delete"
                          onClick={() => deleteMutation.mutate(u.id)}
                          title="Delete user"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Create User Modal ── */}
      {showCreateModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2 className="admin-modal-title">Create / Invite User</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createMutation.mutate()
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}
            >
              {createError && (
                <div style={{ color: 'var(--color-error)', fontSize: '0.85rem', background: '#fee2e2', padding: '0.5rem', borderRadius: '4px' }}>
                  {createError}
                </div>
              )}

              <div>
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Kumar"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div>
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="anand@example.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div>
                <label className="form-label">Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div>
                <label className="form-label">Role *</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                >
                  <option value="VENDOR_ADMIN">Tenant Admin (Full Tenant Access)</option>
                  <option value="VENDOR_OWNER">Tenant Owner</option>
                  <option value="PRESENTER">Presenter / Host</option>
                  <option value="MODERATOR">Chat Moderator</option>
                  <option value="PLATFORM_OWNER">Platform Superadmin (Global Access)</option>
                </select>
              </div>

              {createForm.role !== 'PLATFORM_OWNER' && (
                <div>
                  <label className="form-label">Assigned Tenant *</label>
                  <select
                    required
                    value={createForm.tenantId}
                    onChange={(e) => setCreateForm({ ...createForm, tenantId: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                  >
                    <option value="">Select Tenant</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.slug})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <Button variant="ghost" type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={createMutation.isPending}>
                  Create Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {resetModalUser && (
        <div className="admin-modal-backdrop" onClick={() => setResetModalUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h2 className="admin-modal-title">Reset Password</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', margin: '0.5rem 0 1rem' }}>
              Set a new password for <strong>{resetModalUser.name}</strong> ({resetModalUser.email}).
            </p>

            {resetSuccess && (
              <div style={{ color: 'var(--color-success)', background: '#dcfce7', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                ✓ {resetSuccess}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                resetPasswordMutation.mutate()
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div>
                <label className="form-label">New Password *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <Button variant="ghost" type="button" onClick={() => setResetModalUser(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={resetPasswordMutation.isPending}>
                  Save New Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
