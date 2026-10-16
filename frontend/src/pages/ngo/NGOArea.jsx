import { Routes, Route, NavLink } from 'react-router-dom'
import NGODashboard from '../NGODashboard'
import NGORequirements from './NGORequirements'
import NGOMyRequests from './NGOMyRequests'
import ReceivedDonations from './ReceivedDonations'
import NGOReports from './NGOReports'

const tabs = [
  { to: '/dashboard', label: 'Available Donations', end: true },
  { to: '/dashboard/requirements', label: 'My Requirements' },
  { to: '/dashboard/my-requests', label: 'My Pickup Requests' },
  { to: '/dashboard/received', label: 'Received Donations' },
  { to: '/dashboard/reports', label: 'Reports' },
]

export default function NGOArea() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex gap-4 mb-6 border-b overflow-x-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `pb-2 px-1 font-medium whitespace-nowrap ${
                isActive ? 'border-b-2 border-eco-green text-eco-green' : 'text-gray-500'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Routes>
        <Route index element={<NGODashboard />} />
        <Route path="requirements" element={<NGORequirements />} />
        <Route path="my-requests" element={<NGOMyRequests />} />
        <Route path="received" element={<ReceivedDonations />} />
        <Route path="reports" element={<NGOReports />} />
      </Routes>
    </div>
  )
}
