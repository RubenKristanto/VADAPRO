import { useState } from 'react';
import axios from 'axios'; // <-- Added missing import
import './LoginPage.css';

function LoginPage() {
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
    setIsLoading(true); // <-- Fixed function name
    setMessage(''); // Clear previous messages
    try {
      const res = await axios.post('http://localhost:3001/auth/register', { username, password });
      setMessage(res.data.message);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false); // <-- Fixed function name
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setMessage('Please enter both username and password');
      return;
    }
    setIsLoading(true); // <-- Fixed function name
    setMessage(''); // Clear previous messages
    try {
      const res = await axios.post('http://localhost:3001/auth/login', { username, password });
      setMessage(res.data.message);
      // You can handle token/user here if needed
    } catch (err) {
      setMessage(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false); // <-- Fixed function name
    }
  };

  // The return statement must be inside the component function
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
              type="submit"
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
} // <-- Correctly placed closing brace

export default LoginPage;