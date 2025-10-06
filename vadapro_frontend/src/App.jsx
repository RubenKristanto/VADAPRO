import { useState, useEffect } from 'react'
import LoginPage from './LoginPage.jsx'
import OrganizationsPage from './OrganizationsPage.jsx'
import { authService } from './services/authentication.js'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already authenticated on app start
    const authenticated = authService.isAuthenticated()
    setIsAuthenticated(authenticated)
    
    setIsLoading(false)
  }, [])

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    authService.logout()
    setIsAuthenticated(false)
  }

  if (isLoading) {
    return (
      <div className="App">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading application...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="App">
      {/* Main application content */}
      {isAuthenticated ? (
        <OrganizationsPage 
          onLogout={handleLogout}
        />
      ) : (
        <LoginPage 
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </div>
  )
}

export default App
