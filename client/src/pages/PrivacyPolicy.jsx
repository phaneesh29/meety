import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#202124] text-gray-300 font-sans p-6 sm:p-12">
      <div className="max-w-3xl mx-auto bg-[#27292d] p-8 sm:p-12 rounded-2xl border border-[#3c4043] shadow-xl">
        <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-indigo-400" />
            <h1 className="text-3xl font-semibold text-white">Privacy Policy</h1>
        </div>
        
        <div className="space-y-8 text-sm leading-relaxed">
            <section>
                <p>Last updated: March 2026</p>
                <p className="mt-4">
                    At Meety, we believe in being entirely transparent about what data we collect and how we use it. 
                    This Privacy Policy outlines exactly how your information is handled when you use our video conferencing platform.
                </p>
            </section>

            <section>
                <h2 className="text-xl font-medium text-white mb-3">1. Information We Collect</h2>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Account Information:</strong> When you sign up, we collect your email address, name, and profile picture using our authentication provider (Clerk).</li>
                    <li><strong>Meeting Metadata:</strong> We store the room codes you create, and the exact timestamps of when you join and leave a meeting room to provide analytics to room hosts.</li>
                    <li><strong>Chat Messages:</strong> <strong>We permanently store text messages</strong> sent within the in-meeting chat. These are saved in our database to allow participants to view history if they reconnect, and to maintain meeting records.</li>
                    <li><strong>Feedback:</strong> Any feedback or bug reports you submit through our platform are stored alongside your User ID.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-xl font-medium text-white mb-3">2. Information We DO NOT Collect</h2>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Audio and Video Streams:</strong> Your camera and microphone data are transmitted directly between participants using WebRTC technology (Peer-to-Peer). <strong>We do not record, intercept, or store your audio or video streams on our servers.</strong></li>
                </ul>
            </section>

            <section>
                <h2 className="text-xl font-medium text-white mb-3">3. How We Use Your Information</h2>
                <p>The data we collect is used strictly for the following purposes:</p>
                <ul className="list-disc pl-5 mt-2 space-y-2">
                    <li>To authenticate you and maintain your account security.</li>
                    <li>To facilitate the core functionality of the app (creating rooms, joining calls, sending chat messages).</li>
                    <li>To provide usage analytics (meeting duration, participant timelines) to the host of the meeting.</li>
                    <li>To improve our platform based on user feedback.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-xl font-medium text-white mb-3">4. Third-Party Services</h2>
                <p>We use the following third-party services which may collect data according to their own privacy policies:</p>
                <ul className="list-disc pl-5 mt-2 space-y-2">
                    <li><strong>Clerk:</strong> Used for secure user authentication and session management.</li>
                    <li><strong>Google STUN Servers:</strong> Used strictly to help establish the Peer-to-Peer WebRTC connections for video and audio.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-xl font-medium text-white mb-3">5. Data Retention</h2>
                <p>
                    Your account data, meeting metadata, and chat messages are retained for as long as your account is active. 
                    If you wish to have your account and associated data permanently deleted, please contact the administrator.
                </p>
            </section>
        </div>

        <div className="mt-12 pt-6 border-t border-[#3c4043]">
            <Link to="/" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                &larr; Back to Dashboard
            </Link>
        </div>
      </div>
    </div>
  );
}