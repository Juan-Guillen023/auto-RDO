import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AuthGate from './components/AuthGate.jsx'
import { acordarServidor } from './services/apiClient'

// Fora do React: roda uma vez só, mesmo com o StrictMode duplicando efeitos
acordarServidor()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </StrictMode>,
)
