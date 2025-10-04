import { StrictMode } from 'react'  // make sure deprecated code is not used
import { createRoot } from 'react-dom/client' // for actually displaying the app
import './index.css'           // global styling file
import App from './App.jsx'     // get the main app component

createRoot(document.getElementById('root')).render( 
  <StrictMode>
    <App />
  </StrictMode>,
)
