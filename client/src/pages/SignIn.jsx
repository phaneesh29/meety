import { SignIn } from '@clerk/react'

export default function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-black via-zinc-950 to-black items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl opacity-60"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-zinc-300/10 rounded-full blur-3xl opacity-60"></div>
      <div className="w-full max-w-md space-y-8 flex flex-col items-center z-10">
        <SignIn
          routing="path"
          path="/sign-in"
        />
      </div>
    </div>
  )
}


