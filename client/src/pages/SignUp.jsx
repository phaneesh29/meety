import { SignUp } from '@clerk/react'
import { dark } from '@clerk/themes';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen bg-[#202124] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 flex flex-col items-center">
        <SignUp routing="path" path="/sign-up" appearance={{ baseTheme: dark }} />
      </div>
    </div>
  )
}
