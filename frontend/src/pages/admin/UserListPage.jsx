import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

/**
 * title - heading text
 * roleFilter - 'donor' | 'ngo' | 'volunteer' | null (null = show everyone)
 */
export default function UserListPage({ title, roleFilter }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (roleFilter) query = query.eq('role', roleFilter)
    const { data } = await query
    setUsers(data || [])
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-eco-green mb-4">{title}</h1>
      {loading && <p className="text-gray-400">Loading...</p>}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Role</th>
              <th className="p-3">Organization</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Address</th>
              <th className="p-3">Verified</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3 font-medium">{u.full_name}</td>
                <td className="p-3 capitalize">{u.role}</td>
                <td className="p-3">{u.organization_name || '—'}</td>
                <td className="p-3">{u.phone || '—'}</td>
                <td className="p-3">{u.address || '—'}</td>
                <td className="p-3">
                  {u.is_verified ? (
                    <span className="text-green-600 font-medium">✅ Yes</span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && users.length === 0 && <p className="text-gray-400 p-4">Koi user nahi mila.</p>}
      </div>
    </div>
  )
}
