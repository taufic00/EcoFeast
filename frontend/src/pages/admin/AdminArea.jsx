import { Routes, Route } from 'react-router-dom'
import AdminSidebar from '../../components/AdminSidebar'
import AdminHome from './AdminHome'
import Users from './Users'
import Donors from './Donors'
import NGOs from './NGOs'
import Donations from './Donations'
import Reports from './Reports'
import Verification from './Verification'

export default function AdminArea() {
  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1 p-6">
        <Routes>
          <Route index element={<AdminHome />} />
          <Route path="users" element={<Users />} />
          <Route path="donors" element={<Donors />} />
          <Route path="ngos" element={<NGOs />} />
          <Route path="donations" element={<Donations />} />
          <Route path="reports" element={<Reports />} />
          <Route path="verification" element={<Verification />} />
        </Routes>
      </div>
    </div>
  )
}
