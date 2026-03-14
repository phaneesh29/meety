import { SignIn } from '@clerk/react'

export default function SignInPage() {
  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 flex flex-col items-center">
        <SignIn 
          routing="path" 
          path="/sign-in" 
          appearance={{
            elements: {
              cardBox: "shadow-none border-none bg-transparent"
            }
          }}
        />
      </div>
    </div>
  )
}
