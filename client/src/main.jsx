import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/react'
import { dark } from '@clerk/themes'
import './index.css'
import App from './App.jsx'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

createRoot(document.getElementById('root')).render(
  <ClerkProvider
    publishableKey={publishableKey}
    signInUrl="/sign-in"
    signUpUrl="/sign-up"
    afterSignInUrl="/dashboard"
    afterSignUpUrl="/dashboard"
    appearance={{
      baseTheme: dark,
      variables: {
        colorBackground: '#27292d',
        colorInputBackground: '#1a1b1e',
        colorTextOnPrimaryBackground: '#ffffff',
        colorPrimary: '#2563eb', // blue-600
        colorText: '#e5e7eb', // gray-200
        colorTextSecondary: '#9ca3af', // gray-400
        colorDanger: '#ef4444',
      },
      elements: {
        cardBox: 'shadow-none border border-[#3c4043] rounded-xl',
        navbar: 'border-r border-[#3c4043]',
        navbarButton: 'hover:bg-[#1a1b1e]',
        pageScrollBox: 'bg-[#27292d]',
        profileSection: 'border-b border-[#3c4043]',
        menuButton: 'hover:bg-[#1a1b1e]',
        input: 'border-[#3c4043] focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
        footerActionLink: 'text-blue-500 hover:text-blue-400',
        formButtonPrimary: 'shadow-none bg-blue-600 hover:bg-blue-700',
      }
    }}
  >
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ClerkProvider>
)
