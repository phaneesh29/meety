import { UserProfile } from '@clerk/react'
import FeedbackForm from '../components/FeedbackForm';

export default function ProfilePage() {
  return (
    <div className="flex flex-col items-center pb-12 w-full">
      <div className="w-full max-w-4xl mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Account Settings</h1>
        <p className="text-gray-400">Manage your profile information and security preferences.</p>
      </div>
      <div className="w-full max-w-4xl flex justify-center">
        <UserProfile 
          routing="path" 
          path="/profile" 
          appearance={{
            elements: {
              cardBox: "w-full max-w-none shadow-none",
              rootBox: "w-full"
            }
          }}
        />
      </div>
      
      <FeedbackForm />
    </div>
  )
}
