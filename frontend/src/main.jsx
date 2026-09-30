import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.jsx'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

if (!GOOGLE_CLIENT_ID) {
  console.warn('[VOLTMAXHUB OAuth Warning]: VITE_GOOGLE_CLIENT_ID muhit o\'zgaruvchisi o\'rnatilmagan! Netlify Site configuration > Environment variables bo\'limiga VITE_GOOGLE_CLIENT_ID qo\'shilishi kerak.');
} else {
  console.log('[VOLTMAXHUB OAuth]: Google Client ID muvaffaqiyatli yuklandi.');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || 'not-configured'}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
