import { useState } from 'react';
import { useUser, useAuth } from '@clerk/react';
import { Send, MessageSquare } from 'lucide-react';
import { apiRequest } from '../lib/api';

export default function Feedback() {
  const { isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setSubmitting(true);
    try {
      const token = await getToken();
      await apiRequest('POST', '/api/feedback', token, { message: feedback });
      setSubmitted(true);
      setFeedback('');
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error("Failed to submit feedback", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-8 duration-500 pt-8">
      <div className="bg-black/60 backdrop-blur-3xl p-8 sm:p-10 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-neutral-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 bg-zinc-500/20 text-zinc-400 rounded-xl">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide">Send Feedback</h1>
          </div>
          <p className="text-gray-400 mb-8 font-medium">Have a suggestion or found a bug? Let us know how we can improve Meety for you!</p>
          
          {submitted ? (
            <div className="bg-zinc-500/10 border border-zinc-500/30 text-zinc-300 p-6 rounded-2xl flex flex-col items-center justify-center gap-4 text-center animate-in zoom-in-95 duration-300">
              <div className="w-12 h-12 bg-zinc-500/20 rounded-full flex items-center justify-center text-zinc-400">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Feedback Sent!</h3>
                <p className="text-sm">Thank you for taking the time to share your perspective. We review every submission.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us what you think... (e.g. Can you add a screen sharing feature?)"
                  className="w-full bg-white/5 border border-white/10 text-white rounded-2xl p-5 min-h-[160px] focus:outline-none focus:border-zinc-500 focus:bg-white/10 transition-all font-medium placeholder-gray-500 resize-y shadow-inner"
                  required
                  disabled={submitting}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !feedback.trim()}
                  className="flex items-center gap-2 bg-zinc-600 hover:bg-zinc-500 disabled:opacity-50 disabled:hover:bg-zinc-600 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-zinc-500/20"
                >
                  {submitting ? 'Sending...' : (
                    <>
                      <Send className="w-4 h-4 ml-1" />
                      Submit
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

