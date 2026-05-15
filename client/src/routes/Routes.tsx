import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { EquipmentList } from '../features/equipment/components/EquipmentList'
import { Dashboard } from '../features/dashboard/Dashboard'

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Dashboard</div>} />
        <Route path="/equipment" element={<EquipmentList />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* エンドポイントの追加はここ */}
      </Routes>
    </BrowserRouter>
  )
}
