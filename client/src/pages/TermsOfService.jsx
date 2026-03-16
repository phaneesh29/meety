import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

export default function TermsOfService() {
  return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-black via-zinc-950 to-black text-gray-300 p-6 sm:p-12">
            <div className="max-w-3xl mx-auto bg-black/60 backdrop-blur-3xl p-8 sm:p-12 rounded-3xl border border-white/15 shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
            <FileText className="w-8 h-8 text-zinc-400" />
            <h1 className="text-3xl font-semibold text-white">Terms of Service</h1>
        </div>
        
        <div className="space-y-8 text-sm leading-relaxed">
            <section>
                <p>Last updated: March 2026</p>
                <p className="mt-4">
                    Welcome to Meety. By using our platform, you agree to the following strictly enforced terms and conditions. 
                    Please read them carefully.
                </p>
            </section>

            <section>
                <h2 className="text-xl font-medium text-white mb-3">1. Service Overview</h2>
                <p>
                    Meety provides free, real-time video and audio conferencing using peer-to-peer (WebRTC) technology, alongside persistent text chat features. We offer this service "as is" and make no guarantees regarding uninterrupted uptime, video quality, or network stability, as much of the performance relies on your own network and the networks of your peers.
                </p>
            </section>

            <section>
                <h2 className="text-xl font-medium text-white mb-3">2. User Conduct and Chat Messages</h2>
                <p>By joining or creating a room on Meety, you agree that you will not use the service to:</p>
                <ul className="list-disc pl-5 mt-2 space-y-2">
                    <li>Distribute illegal, harmful, harassing, or grossly offensive content.</li>
                    <li>Attempt to exploit, hack, or manipulate the platform's infrastructure.</li>
                    <li>Impersonate other users or deceive participants.</li>
                </ul>
                <p className="mt-4">
                    <strong>Important:</strong> Because text chat messages sent during meetings are permanently saved to our database, they can be reviewed by administrators if a meeting room is reported for abuse. 
                </p>
            </section>

            <section>
                <h2 className="text-xl font-medium text-white mb-3">3. Account and Room Termination</h2>
                <p>
                    We reserve the right to suspend or terminate your account, and delete any rooms, chats, or meeting data immediately and without prior notice, if we believe you have violated these Terms of Service.
                </p>
            </section>

            <section>
                <h2 className="text-xl font-medium text-white mb-3">4. Limitation of Liability</h2>
                <p>
                    Under no circumstances shall Meety, its creators, or its operators be held liable for any direct, indirect, incidental, or consequential damages resulting from your use or inability to use the platform. This includes, but is not limited to, data loss, missed meetings, or unauthorized access to your account due to your own negligence.
                </p>
            </section>

            <section>
                <h2 className="text-xl font-medium text-white mb-3">5. Intellectual Property</h2>
                <p>
                    You retain all rights to the intellectual property of the text chat and audio/video discussions you conduct on the platform. However, you grant us the necessary licenses to transmit and (in the case of chat messages) store this data to facilitate the basic functions of the service.
                </p>
            </section>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10">
            <Link to="/" className="text-zinc-400 hover:text-zinc-300 font-medium transition-colors">
                &larr; Back to Dashboard
            </Link>
        </div>
      </div>
    </div>
  );
}

