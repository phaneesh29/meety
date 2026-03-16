import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/react'
import { dark } from '@clerk/ui/themes'
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
      theme: dark,
      variables: {
        colorPrimary: '#f4f4f5',
        colorText: '#f5f5f5',
        colorTextSecondary: '#a1a1aa',
        colorBackground: 'rgba(255, 255, 255, 0.03)',
        colorInputBackground: 'rgba(255, 255, 255, 0.04)',
        colorInputText: '#f5f5f5',
        borderRadius: '0.9rem',
      },
      elements: {
        card: 'backdrop-blur-2xl border border-white/15 shadow-2xl',
        formButtonPrimary: 'bg-zinc-100 text-black hover:bg-white',
        footerActionLink: 'text-zinc-300 hover:text-white',
      },
      signIn: {
        theme: dark,
        elements: {
          card: 'bg-black/55 backdrop-blur-3xl border border-white/15 shadow-2xl',
          socialButtonsBlockButton: 'hover:bg-white/5 border-white/10',
          headerTitle: 'text-white tracking-tight',
          headerSubtitle: 'text-gray-400',
          dividerRow: 'hidden',
          formButtonPrimary: 'bg-zinc-100 hover:bg-white text-black',
          footerActionText: 'text-gray-400',
          footerActionLink: 'text-zinc-300 hover:text-white',
        },
      },
      signUp: {
        theme: dark,
        elements: {
          card: 'bg-black/55 backdrop-blur-3xl border border-white/15 shadow-2xl',
          socialButtonsBlockButton: 'hover:bg-white/5 border-white/10',
          headerTitle: 'text-white tracking-tight',
          headerSubtitle: 'text-gray-400',
          dividerRow: 'hidden',
          formButtonPrimary: 'bg-zinc-100 hover:bg-white text-black',
          footerActionText: 'text-gray-400',
          footerActionLink: 'text-zinc-300 hover:text-white',
        },
      },
      userProfile: {
        theme: dark,
        elements: {
          rootBox: 'w-full',
          cardBox: 'w-full max-w-none shadow-none',
          card: 'bg-black/60 backdrop-blur-3xl border border-white/15 shadow-2xl',
          formButtonPrimary: 'bg-zinc-100 text-black hover:bg-white',
        },
      },
    }}
  >
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ClerkProvider>
)


