import { NavLink } from 'react-router-dom'

const links = [
  { to: '/dashboard', label: 'Dashboard', end: true },
  { to: '/dashboard/donate', label: 'Donate Food' },
  { to: '/dashboard/my-donations', label: 'My Donations' },
  { to: '/dashboard/history', label: 'Donation History' },
  { to: '/dashboard/pickup-requests', label: 'Pickup Requests' },
  { to: '/dashboard/messages', label: 'Messages' },
  { to: '/dashboard/notifications', label: 'Notifications' },
  { to: '/dashboard/profile', label: 'Profile' },
]

export default function DonorSidebar() {
  return (
    <aside className="w-56 bg-white border-r min-h-[calc(100vh-56px)] p-4">
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `px-3 py-2 rounded text-sm font-medium ${
                isActive ? 'bg-eco-green text-white' : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
