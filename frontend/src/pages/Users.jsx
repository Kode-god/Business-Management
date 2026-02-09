import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users as UsersIcon,
  ArrowLeft,
  Plus,
  Search,
  UserPlus,
  Mail,
  Shield,
  UserCheck,
  UserX,
  Pencil,
  Trash2,
  Loader,
  AlertCircle,
  X,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const roleLabel = (role) => {
  const r = (role || '').toLowerCase();
  if (r === 'owner') return 'Owner';
  if (r === 'manager') return 'Manager';
  return 'Cashier';
};

const roleBadgeClass = (role) => {
  const r = (role || '').toLowerCase();
  if (r === 'owner') return 'bg-purple-50 text-purple-700 border-purple-200';
  if (r === 'manager') return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-green-50 text-green-700 border-green-200';
};

export const Users = () => {
  const navigate = useNavigate();

  const token = useMemo(() => localStorage.getItem('token'), []);
  const currentRole = useMemo(() => (localStorage.getItem('role') || 'cashier').toLowerCase(), []);
  const isOwner = currentRole === 'owner';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');

  // Add user form
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'cashier',
    password: '',
  });

  // Edit user
  const [editUserId, setEditUserId] = useState(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    role: 'cashier',
    isActive: true,
  });

  const headers = useMemo(() => {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, [token]);

  const fetchUsers = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users`, { headers });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || data?.error || 'Failed to load users');
      }

      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e) {
      setError(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const full = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
      return (
        full.includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
      );
    });
  }, [users, search]);

  const startEdit = (u) => {
    setError('');
    setEditUserId(u._id || u.id);
    setEditForm({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      role: (u.role || 'cashier').toLowerCase(),
      isActive: u.isActive !== false,
    });
  };

  const cancelEdit = () => {
    setEditUserId(null);
    setEditForm({ firstName: '', lastName: '', role: 'cashier', isActive: true });
  };

  const saveEdit = async () => {
    if (!editUserId) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/users/${editUserId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed to update user');

      // Refresh list
      await fetchUsers();
      cancelEdit();
    } catch (e) {
      setError(e.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u) => {
    // Only owner should toggle status
    if (!isOwner) return;

    setSaving(true);
    setError('');
    try {
      const userId = u._id || u.id;
      const res = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ isActive: !(u.isActive !== false) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed to update status');

      await fetchUsers();
    } catch (e) {
      setError(e.message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (u) => {
    if (!isOwner) return;

    const userId = u._id || u.id;
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;

    // simple confirm (no extra libs)
    const ok = window.confirm(`Delete user "${fullName}"? This cannot be undone.`);
    if (!ok) return;

    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed to delete user');

      await fetchUsers();
    } catch (e) {
      setError(e.message || 'Failed to delete user');
    } finally {
      setSaving(false);
    }
  };

  const addUser = async (e) => {
    e.preventDefault();
    if (!isOwner) return;

    setSaving(true);
    setError('');
    try {
      if (!addForm.firstName || !addForm.lastName || !addForm.email || !addForm.password) {
        throw new Error('Please fill all required fields');
      }
      if (addForm.password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      const payload = {
        email: addForm.email.trim(),
        password: addForm.password,
        firstName: addForm.firstName.trim(),
        lastName: addForm.lastName.trim(),
        role: addForm.role,
      };

      const res = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed to add user');

      setShowAdd(false);
      setAddForm({ firstName: '', lastName: '', email: '', role: 'cashier', password: '' });

      await fetchUsers();
    } catch (e2) {
      setError(e2.message || 'Failed to add user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Back"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>

            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-lg">
                <UsersIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                <p className="text-sm text-gray-600">
                  Manage manager/cashier accounts for your business
                </p>
              </div>
            </div>
          </div>

          {isOwner && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Search + Info */}
        <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or role..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div className="text-sm text-gray-600">
              Role: <span className="font-semibold">{roleLabel(currentRole)}</span> • Total users:{' '}
              <span className="font-semibold">{users.length}</span>
            </div>
          </div>
        </div>

        {/* Users table */}
        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Users</h2>
            {(loading || saving) && (
              <span className="inline-flex items-center gap-2 text-sm text-gray-600">
                <Loader className="w-4 h-4 animate-spin" /> Working...
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Name</th>
                  <th className="text-left px-6 py-3 font-semibold">Email</th>
                  <th className="text-left px-6 py-3 font-semibold">Role</th>
                  <th className="text-left px-6 py-3 font-semibold">Status</th>
                  <th className="text-right px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td className="px-6 py-6 text-gray-600" colSpan={5}>
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-gray-600" colSpan={5}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const id = u._id || u.id;
                    const isEditing = editUserId === id;
                    const active = u.isActive !== false;

                    return (
                      <tr key={id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                value={editForm.firstName}
                                onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="First"
                              />
                              <input
                                value={editForm.lastName}
                                onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Last"
                              />
                            </div>
                          ) : (
                            <div className="font-semibold text-gray-900">
                              {u.firstName} {u.lastName}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 text-gray-700">
                          <div className="inline-flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {u.email}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {isEditing ? (
                            <select
                              value={editForm.role}
                              onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                              disabled={!isOwner}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            >
                              <option value="owner">Owner</option>
                              <option value="manager">Manager</option>
                              <option value="cashier">Cashier</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${roleBadgeClass(
                                u.role
                              )}`}
                            >
                              <Shield className="w-3.5 h-3.5" />
                              {roleLabel(u.role)}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {isEditing ? (
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={editForm.isActive}
                                onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))}
                                disabled={!isOwner}
                              />
                              Active
                            </label>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${
                                active
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {active ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                              {active ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={saveEdit}
                                  disabled={saving}
                                  className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:bg-gray-400 transition"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  disabled={saving}
                                  className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                {isOwner && (
                                  <>
                                    <button
                                      onClick={() => startEdit(u)}
                                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                                      title="Edit"
                                    >
                                      <Pencil className="w-4 h-4 text-gray-700" />
                                    </button>

                                    <button
                                      onClick={() => toggleActive(u)}
                                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                                      title={active ? 'Deactivate' : 'Activate'}
                                    >
                                      {active ? (
                                        <UserX className="w-4 h-4 text-gray-700" />
                                      ) : (
                                        <UserCheck className="w-4 h-4 text-gray-700" />
                                      )}
                                    </button>

                                    <button
                                      onClick={() => deleteUser(u)}
                                      className="p-2 rounded-lg bg-red-50 hover:bg-red-100 transition"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                  </>
                                )}

                                {!isOwner && (
                                  <span className="text-xs text-gray-500">Owner only</span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add User Drawer/Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-50">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900">Add New User</h3>
              </div>
              <button
                onClick={() => setShowAdd(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
                title="Close"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <form onSubmit={addUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">First Name</label>
                  <input
                    value={addForm.firstName}
                    onChange={(e) => setAddForm((p) => ({ ...p, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name</label>
                  <input
                    value={addForm.lastName}
                    onChange={(e) => setAddForm((p) => ({ ...p, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Role</label>
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm((p) => ({ ...p, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="manager">Manager</option>
                    <option value="cashier">Cashier</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Owners should not be created from here.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Temporary Password</label>
                  <input
                    type="password"
                    value={addForm.password}
                    onChange={(e) => setAddForm((p) => ({ ...p, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    User can change later (if you add reset).
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold transition disabled:opacity-70"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:bg-gray-400 inline-flex items-center gap-2"
                >
                  {saving ? <Loader className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
