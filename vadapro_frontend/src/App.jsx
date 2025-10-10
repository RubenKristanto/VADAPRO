import { useState, useEffect } from 'react'
import LoginPage from './LoginPage.jsx'
import OrganizationsPage from './OrganizationsPage.jsx'
import ProgramsPage from './ProgramsPage.jsx'
import { authService } from './services/authentication.js'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState('organizations') // 'organizations' or 'programs'
  const [selectedOrganization, setSelectedOrganization] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    // Check if user is already authenticated on app start
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
  }

  const handleLogout = () => {
    authService.logout()
    setIsAuthenticated(false)
    setCurrentUser(null)
    setCurrentView('organizations')
    setSelectedOrganization(null)
  }

  const handleOrganizationSelect = (organization) => {
    setSelectedOrganization(organization)
    setCurrentView('programs')
  }

  const handleBackToOrganizations = () => {
    setCurrentView('organizations')
    setSelectedOrganization(null)
  }

  if (isLoading) {
    return <div className="App">Loading...</div>
  }

  return (
    <div className="App">
      {isAuthenticated ? (
        currentView === 'organizations' ? (
          <OrganizationsPage 
            onLogout={handleLogout} 
            onOrganizationSelect={handleOrganizationSelect}
            currentUser={currentUser}
          />
        ) : (
          <ProgramsPage 
            organization={selectedOrganization}
            onBack={handleBackToOrganizations}
            onLogout={handleLogout}
            currentUser={currentUser}
          />
        )
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  )
}

export default App
