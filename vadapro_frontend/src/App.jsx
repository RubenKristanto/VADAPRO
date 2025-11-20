import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './LoginPage.jsx'
import OrganizationPage from './OrganizationPage.jsx'
import ProgramPage from './ProgramPage.jsx'
import DataPage from './DataPage.jsx'
import ProcessPage from './ProcessPage.jsx'
import { authService } from './services/authentication.js'
import './App.css'

function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const authenticated = authService.isAuthenticated()
    setIsAuthenticated(authenticated)
    setIsLoading(false)
  }, [])

  if (isLoading) return <div className="App">Loading...</div>

  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(false)
  }, [])

  if (isLoading) return <div className="App">Loading...</div>

  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><OrganizationPage /></ProtectedRoute>} />
        <Route path="/organizations" element={<ProtectedRoute><OrganizationPage /></ProtectedRoute>} />
        <Route path="/organizations/:orgId/programs" element={<ProtectedRoute><ProgramPage /></ProtectedRoute>} />
        <Route path="/organizations/:orgId/programs/:programId/years/:year/data" element={<ProtectedRoute><DataPage /></ProtectedRoute>} />
        <Route path="/organizations/:orgId/programs/:programId/years/:year/entries/:entryId/process" element={<ProtectedRoute><ProcessPage /></ProtectedRoute>} />
      </Routes>
    </div>
  )
}

export default App
