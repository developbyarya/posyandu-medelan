import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { PwaToast } from './components/PwaToast'
import { Roster } from './pages/Roster'
import { NotFound } from './pages/NotFound'
import Kalkulator from './pages/Kalkulator'
import BalitaForm from './pages/BalitaForm'
import Riwayat from './pages/Riwayat'
import EditKunjungan from './pages/EditKunjungan'
import Login from './pages/import/Login'
import OcrUpload from './pages/import/OcrUpload'
import OcrPreview from './pages/import/OcrPreview'
import WizardLayout from './pages/wizard/WizardLayout'
import Step1BB from './pages/wizard/Step1BB'
import Step2TB from './pages/wizard/Step2TB'
import Step3Lingkar from './pages/wizard/Step3Lingkar'
import Step4Skrining from './pages/wizard/Step4Skrining'
import Step4bCatatan from './pages/wizard/Step4bCatatan'
import Step5Hasil from './pages/wizard/Step5Hasil'
import RekapPrint from './pages/RekapPrint'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Roster />} />
        <Route path="/rekap-print" element={<RekapPrint />} />
        <Route path="/kalkulator" element={<Kalkulator />} />
        <Route path="/balita/baru" element={<BalitaForm />} />
        <Route path="/balita/:id/edit" element={<BalitaForm />} />
        <Route path="/balita/:balitaId/riwayat" element={<Riwayat />} />
        <Route path="/kunjungan/:visitId/edit" element={<EditKunjungan />} />
        
        {/* Sprint 7: OCR Import Routes */}
        <Route path="/import/login" element={<Login />} />
        <Route path="/import/upload" element={<OcrUpload />} />
        <Route path="/import/preview" element={<OcrPreview />} />

        <Route path="/timbang/:balitaId" element={<WizardLayout />}>
          <Route path="bb" element={<Step1BB />} />
          <Route path="tb" element={<Step2TB />} />
          <Route path="lingkar" element={<Step3Lingkar />} />
          <Route path="skrining" element={<Step4Skrining />} />
          <Route path="catatan" element={<Step4bCatatan />} />
          <Route path="hasil" element={<Step5Hasil />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      <PwaToast />
    </BrowserRouter>
  )
}
