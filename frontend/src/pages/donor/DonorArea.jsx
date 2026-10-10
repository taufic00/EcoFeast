import { Routes, Route } from 'react-router-dom'
import DonorSidebar from '../../components/DonorSidebar'
import DonorHome from './DonorHome'
import DonateFood from './DonateFood'
import MyDonations from './MyDonations'
import DonationHistory from './DonationHistory'
import PickupRequests from './PickupRequests'
import Messages from './Messages'
import Notifications from './Notifications'
import Profile from './Profile'

export default function DonorArea() {
  return (
    <div className="flex">
      <DonorSidebar />
      <div className="flex-1 p-6">
        <Routes>
          <Route index element={<DonorHome />} />
          <Route path="donate" element={<DonateFood />} />
          <Route path="my-donations" element={<MyDonations />} />
          <Route path="history" element={<DonationHistory />} />
          <Route path="pickup-requests" element={<PickupRequests />} />
          <Route path="messages" element={<Messages />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
        </Routes>
      </div>
    </div>
  )
}
