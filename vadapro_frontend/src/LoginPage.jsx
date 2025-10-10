import { useState } from 'react';
import { authService } from './services/authentication.js';
import './LoginPage.css';

function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(''); // <-- Renamed state for consistency

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setMessage('Please enter both username and password');
      return;
    }
    setIsLoading(true);
    setMessage('');
    try {
      const result = await authService.register({ username, password });
      setMessage(result.message);
    } catch (err) {
      setMessage(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setMessage('Please enter both username and password');
      return;
    }
    setIsLoading(true);
    setMessage('');
    try {
      console.log('Attempting login with:', { username, password });
      const result = await authService.login({ username, password });
      
      // If login is successful, call the success callback immediately
      if (result && result.token) {
        console.log('login success');
        // Small delay to show success message before transition
        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(result.user);
          }
        }, 500);
      } else {
        console.log('login failed');
      }
      
    } catch (err) {
      console.error('Login error:', err);
      setMessage(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <header className="login-header">
        <h1>VADAPRO <span className="subtitle">visualization tool</span></h1>
      </header>
      <div className="login-content">
        <div className="login-rectangle">
          <h2>Welcome Back</h2>
          <form autoComplete="off">
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                disabled={isLoading}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isLoading}
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>
            
            {/* Area to display feedback messages to the user */}
            {message && <p className="login-message">{message}</p>}

            <button
              type="button"
              onClick={handleLogin}
              className="login-button"
              disabled={isLoading || !username || !password}
            >
              {isLoading ? (<><span className="loading-spinner"></span> Signing in...</>) : ('Sign In')}
            </button>
            
            {/* Added Register button to use the handleRegister function */}
            <button
              type="button"
              onClick={handleRegister}
              className="login-button secondary"
              disabled={isLoading || !username || !password}
            >
              {isLoading ? (<><span className="loading-spinner"></span> Registering...</>) : ('Register')}
            </button>
            
          </form>
          <p className="create-account-link"> Don't have an account? <a href="/register">Create account</a> </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;