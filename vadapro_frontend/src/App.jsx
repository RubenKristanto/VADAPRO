import { useState, useEffect } from 'react'
import LoginPage from './LoginPage.jsx'
import OrganizationPage from './OrganizationPage.jsx'
import ProgramPage from './ProgramPage.jsx'
import DataPage from './DataPage.jsx'
import { authService } from './services/authentication.js'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState('organizations') // 'organizations', 'programs', or 'data'
  const [selectedOrganization, setSelectedOrganization] = useState(null)
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [selectedYear, setSelectedYear] = useState(null)
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
    setSelectedProgram(null)
    setSelectedYear(null)
  }

  const handleOrganizationSelect = (organization) => {
    setSelectedOrganization(organization)
    setCurrentView('programs')
  }

  const handleBackToOrganizations = () => {
    setCurrentView('organizations')
    setSelectedOrganization(null)
    setSelectedProgram(null)
    setSelectedYear(null)
  }

  const handleYearSelect = (program, year) => {
    setSelectedProgram(program)
    setSelectedYear(year)
    setCurrentView('data')
  }

  const handleBackToPrograms = () => {
    setCurrentView('programs')
    setSelectedProgram(null)
    setSelectedYear(null)
  }

  if (isLoading) {
    return <div className="App">Loading...</div>
  }

  return (
    <div className="App">
      {isAuthenticated ? (
        currentView === 'organizations' ? (
          <OrganizationPage 
            onLogout={handleLogout} 
            onOrganizationSelect={handleOrganizationSelect}
            currentUser={currentUser}
          />
        ) : currentView === 'programs' ? (
          <ProgramPage 
            organization={selectedOrganization}
            onBack={handleBackToOrganizations}
            onLogout={handleLogout}
            onYearSelect={handleYearSelect}
            currentUser={currentUser}
          />
        ) : (
          <DataPage 
            program={selectedProgram}
            year={selectedYear}
            onBack={handleBackToPrograms}
            onLogout={handleLogout}
          />
        )
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  )
}

export default App
