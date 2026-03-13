import { SignUp } from '@clerk/react'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen bg-slate-50 items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 flex flex-col items-center">
        <SignUp routing="path" path="/sign-up" />
      </div>
    </div>
  )
}
