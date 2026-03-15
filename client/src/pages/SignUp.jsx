import { SignUp } from '@clerk/react'

export default function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-purple-500/20 rounded-full blur-3xl opacity-50"></div>
      <div className="w-full max-w-md space-y-8 flex flex-col items-center z-10">
        <SignUp routing="path" path="/sign-up" appearance={{ elements: { card: 'bg-[#1a1b1e]/60 backdrop-blur-2xl border border-white/10 shadow-2xl', socialButtonsBlockButton: 'hover:bg-white/5 border-white/10', headerTitle: 'text-white', headerSubtitle: 'text-gray-400', dividerRow: 'hidden', formButtonPrimary: 'bg-indigo-500 hover:bg-indigo-600', footerActionText: 'text-gray-400', footerActionLink: 'text-indigo-400 hover:text-indigo-300' } }} />
      </div>
    </div>
  )
}
