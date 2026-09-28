import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.jsx'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// ✅ Dev tekshiruvi — Google Client ID to'g'ri yuklanganini tasdiqlaydi
if (import.meta.env.DEV) {
  console.log('[Google OAuth] VITE_GOOGLE_CLIENT_ID =', GOOGLE_CLIENT_ID || '❌ TOPILMADI — frontend/.env ni tekshir!');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
