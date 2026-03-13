import { UserProfile } from '@clerk/react'

export default function ProfilePage() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-4xl mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Account Settings</h1>
        <p className="text-slate-500">Manage your profile information and security preferences.</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full max-w-4xl flex justify-center py-8">
        <UserProfile routing="path" path="/profile" />
      </div>
    </div>
  )
}
