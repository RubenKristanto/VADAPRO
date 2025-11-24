import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import LoginPage from './LoginPage.jsx'
import OrganizationPage from './OrganizationPage.jsx'
import ProgramPage from './ProgramPage.jsx'
import DataPage from './DataPage.jsx'
import ProcessPage from './ProcessPage.jsx'
import { authService } from './services/authentication.js'
import './App.css'

function ProtectedRoute({ children }) {
  const isAuthenticated = authService.isAuthenticated()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const authenticated = authService.isAuthenticated()
    if (authenticated) {
      const user = authService.getCurrentUser()
      setCurrentUser(user)
    }
    setIsAuthenticated(authenticated)
    setIsLoading(false)
  }, [])

  const handleLoginSuccess = (user) => {
    setIsAuthenticated(true)
    setCurrentUser(user)
    navigate('/organizations')
  }

  const handleLogout = () => {
    authService.logout()
    setIsAuthenticated(false)
    setCurrentUser(null)
    navigate('/login')
  }

  if (isLoading) {
    return <div className="App">Loading...</div>
  }

  return (
    <div className="App">
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
              <Navigate to="/organizations" replace /> : 
              <LoginPage onLoginSuccess={handleLoginSuccess} />
          } 
        />
        <Route 
          path="/organizations" 
          element={
            <ProtectedRoute>
              <OrganizationPage 
                onLogout={handleLogout}
                currentUser={currentUser}
              />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/organizations/:organizationId/programs" 
          element={
            <ProtectedRoute>
              <ProgramPage 
                onLogout={handleLogout}
                currentUser={currentUser}
              />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/organizations/:organizationId/programs/:programId/year/:year/data" 
          element={
            <ProtectedRoute>
              <DataPage 
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/organizations/:organizationId/programs/:programId/year/:year/data/:entryId/process" 
          element={
            <ProtectedRoute>
              <ProcessPage 
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/" 
          element={<Navigate to={isAuthenticated ? "/organizations" : "/login"} replace />} 
        />
        <Route 
          path="*" 
          element={<Navigate to={isAuthenticated ? "/organizations" : "/login"} replace />} 
        />
      </Routes>
    </div>
  )
}

export default App
