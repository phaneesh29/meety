import { UserProfile } from '@clerk/react'
import { dark } from '@clerk/themes';

export default function ProfilePage() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-4xl mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Account Settings</h1>
        <p className="text-gray-400">Manage your profile information and security preferences.</p>
      </div>
      <div className="bg-[#27292d] rounded-xl shadow-sm border border-[#3c4043] overflow-hidden w-full max-w-4xl flex justify-center py-8">
        <UserProfile routing="path" path="/profile" appearance={{ baseTheme: dark }} />
      </div>
    </div>
  )
}
