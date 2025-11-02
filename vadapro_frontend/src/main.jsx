import { createRoot } from 'react-dom/client' // for actually displaying the app
import './index.css'           // global styling file
import App from './App.jsx'     // get the main app component

// StrictMode removed to prevent double-rendering which was causing duplicate process creation
// StrictMode was causing useEffect to run twice in development, creating 2 processes
// This is safe because StrictMode is only a development tool and has no effect in production
createRoot(document.getElementById('root')).render( 
  <App />
)
