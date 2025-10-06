import { useState } from 'react'
import LoginPage from './LoginPage.jsx'
import './App.css'

function App() {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
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
    return <div className="App">Loading...</div>
  }

  return (
    <div className="App">
      {isAuthenticated ? (
        <OrganizationsPage onLogout={handleLogout} />
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
=======

  return (
    <div className="App">
      <LoginPage />
>>>>>>> parent of 7c701f6 (organizations page added)
=======

  return (
    <div className="App">
      <LoginPage />
>>>>>>> parent of 7c701f6 (organizations page added)
=======

  return (
    <div className="App">
      <LoginPage />
>>>>>>> parent of 7c701f6 (organizations page added)
    </div>
  )
}

export default App
