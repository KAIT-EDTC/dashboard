import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { EquipmentList } from '../features/equipment/components/EquipmentList'

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Dashboard</div>} />
        <Route path="/equipment" element={<EquipmentList />} />
        {/* エンドポイントの追加はここ */}
      </Routes>
    </BrowserRouter>
  )
}
