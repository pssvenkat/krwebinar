import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { ManagedUser } from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState, ErrorState } from '../../components/ui/States'

export default function AdminUsersPage() {
  const qc = useQueryClient()

  // Load tenant users
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await api.users.list()
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    staleTime: 30_000,
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'PRESENTER',
  })
  const [addError, setAddError] = useState<string | null>(null)

  // Reset password modal
  const [resetModalUser, setResetModalUser] = useState<ManagedUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)

  // Mutations
  const addMutation = useMutation({
    mutationFn: async () => {
      setAddError(null)
      const res = await api.users.create({
        name: addForm.name,
        email: addForm.email,
        password: addForm.password,
        role: addForm.role,
      })
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      setShowAddModal(false)
      setAddForm({ name: '', email: '', password: '', role: 'PRESENTER' })
    },
    onError: (err) => setAddError(err instanceof Error ? err.message : 'Failed to add member'),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: number }) => {
      const res = await api.users.update(id, { isActive: isActive === 1 ? 0 : 1 })
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!resetModalUser) return
      const res = await api.users.resetPassword(resetModalUser.id, newPassword)
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
      if (!confirm('Remove this team member from your webinar organization?')) return
      const res = await api.users.delete(id)
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  if (isLoading) return <LoadingState label="Loading team members…" />
  if (error) return <ErrorState error={error as Error} />

  const users: ManagedUser[] = data?.users ?? []

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  const totalMembers = users.length
  const admins = users.filter((u) => u.role === 'VENDOR_ADMIN' || u.role === 'VENDOR_OWNER').length
  const presenters = users.filter((u) => u.role === 'PRESENTER').length
  const moderators = users.filter((u) => u.role === 'MODERATOR').length

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Team & User Management</h1>
          <p className="admin-page-subtitle">Manage hosts, presenters, moderators, and team members</p>
        </div>
        <Button variant="primary" size="md" onClick={() => setShowAddModal(true)}>
          + Add Team Member
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="analytics-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.5rem' }}>
        <div className="analytics-kpi-card">
          <p className="analytics-kpi-label">Total Team Members</p>
          <p className="analytics-kpi-value">{totalMembers}</p>
        </div>
        <div className="analytics-kpi-card">
          <p className="analytics-kpi-label">Admins</p>
          <p className="analytics-kpi-value">{admins}</p>
        </div>
        <div className="analytics-kpi-card">
          <p className="analytics-kpi-label">Presenters / Hosts</p>
          <p className="analytics-kpi-value" style={{ color: 'var(--color-primary)' }}>
            {presenters}
          </p>
        </div>
        <div className="analytics-kpi-card">
          <p className="analytics-kpi-label">Chat Moderators</p>
          <p className="analytics-kpi-value">{moderators}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search team members by name or email…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
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
          <option value="VENDOR_ADMIN">Admin</option>
          <option value="PRESENTER">Presenter / Host</option>
          <option value="MODERATOR">Moderator</option>
        </select>
      </div>

      {/* Table */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name & Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Added On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)' }}>
                  No team members found matching your search.
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
                    <Badge variant={u.role === 'VENDOR_ADMIN' ? 'primary' : 'default'}>
                      {u.role === 'VENDOR_ADMIN'
                        ? 'Admin'
                        : u.role === 'PRESENTER'
                        ? 'Presenter / Host'
                        : u.role === 'MODERATOR'
                        ? 'Moderator'
                        : u.role}
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
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="admin-table-action-btn"
                        onClick={() => setResetModalUser(u)}
                        title="Reset password"
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
                      <button
                        type="button"
                        className="admin-table-action-btn admin-table-action-delete"
                        onClick={() => deleteMutation.mutate(u.id)}
                        title="Remove member"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Add Member Modal ── */}
      {showAddModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <h2 className="admin-modal-title">Add Team Member</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                addMutation.mutate()
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}
            >
              {addError && (
                <div style={{ color: 'var(--color-error)', fontSize: '0.85rem', background: '#fee2e2', padding: '0.5rem', borderRadius: '4px' }}>
                  {addError}
                </div>
              )}

              <div>
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div>
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="ramesh@kravemicrogreens.in"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div>
                <label className="form-label">Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div>
                <label className="form-label">Role in Organization *</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                >
                  <option value="PRESENTER">Presenter / Webinar Host</option>
                  <option value="MODERATOR">Chat & Q&A Moderator</option>
                  <option value="VENDOR_ADMIN">Admin (Full Access)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <Button variant="ghost" type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={addMutation.isPending}>
                  Add Member
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
                  Save Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
