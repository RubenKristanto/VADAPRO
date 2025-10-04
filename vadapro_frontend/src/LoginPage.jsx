import { useState } from 'react'
import { authService } from './services/authentication.js'
import './LoginPage.css'

function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    // Simulate API call
    try {
      const credentials = { username, password }
      const result = await authService.login(credentials)
      
      // Handle successful login
      console.log('Login successful:', result)
      alert('Login successful!')
      
    } catch (error) {
      console.error('Login error:', error)
      setError(error.message || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-container">
        <header className="login-header">
            <h1>VADAPRO <span className="subtitle">visualization tool</span></h1>

        </header>

        <div className="login-content">
            <div className="login-rectangle">
                <h2>Welcome Back</h2>

                <form onSubmit={handleLogin} autoComplete="off">
                    <div className="input-group">
                        <label htmlFor="username">Username</label>

                        <input type="text" id="username" name="username" value={username} 
                        onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username"
                        required disabled={isLoading} autoComplete="off" autoCapitalize="off"
                        autoCorrect="off" spellCheck="false"/>

                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Password</label>

                        <div className="password-input-container">
                            <input type={showPassword ? "text" : "password"} id="password" name="password"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password" required disabled={isLoading}
                            autoComplete="new-password" autoCapitalize="off" autoCorrect="off"
                            spellCheck="false"/>

                            <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"} disabled={isLoading}>
                            {showPassword ? 'HIDE' : 'SHOW'}
                            </button>

                        </div>

                    </div>

                    <button type="submit" className="login-button" disabled={isLoading || !username || !password}>
                    {isLoading ? (<> <span className="loading-spinner"></span> Signing in... </>) : ('Sign In')}
                    </button>
                </form>

                <p className="create-account-link"> Don't have an account? <a href="/register">Create account</a> </p>
            </div>
        </div>
    </div>
  )
}

export default LoginPage