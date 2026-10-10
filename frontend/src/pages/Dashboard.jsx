import { useAuth } from '../lib/AuthContext'
import DonorArea from './donor/DonorArea'
import NGOArea from './ngo/NGOArea'
import AdminArea from './admin/AdminArea'

export default function Dashboard() {
  const { profile, loading } = useAuth()

  if (loading) return <p className="text-center mt-10">Loading...</p>
  if (!profile) return <p className="text-center mt-10">Profile not found. Try logging in again.</p>

  if (profile.role === 'donor') return <DonorArea />
  if (profile.role === 'ngo') return <NGOArea />
  if (profile.role === 'admin') return <AdminArea />

  return (
    <div className="text-center mt-10">
      <p>Volunteer dashboard - jald hi add hoga.</p>
    </div>
  )
}
