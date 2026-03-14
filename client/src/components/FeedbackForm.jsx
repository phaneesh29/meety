import { useState } from 'react';
import { useUser, useAuth } from '@clerk/react';
import { Send } from 'lucide-react';
import { apiRequest } from '../lib/api';

export default function FeedbackForm() {
  const { isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isLoaded || !isSignedIn) {
    return null;
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
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      console.error("Failed to submit feedback", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#27292d] p-6 rounded-xl border border-[#3c4043] w-full max-w-4xl mt-6">
      <h2 className="text-xl font-semibold text-white mb-2">Send Feedback</h2>
      <p className="text-gray-400 mb-4 text-sm">Help us improve Meety by sending your feedback.</p>
      
      {submitted ? (
        <div className="bg-green-900/40 text-green-400 p-4 rounded-lg flex items-center gap-2 border border-green-800/50">
          <span>Thank you for your feedback! We appreciate it.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tell us what you think..."
            className="w-full bg-[#1a1b1e] border border-[#3c4043] text-gray-200 rounded-lg p-3 min-h-[120px] focus:outline-none focus:border-blue-500 transition-colors resize-y"
            required
            disabled={submitting}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !feedback.trim()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
            >
              {submitting ? 'Sending...' : (
                <>
                  <Send className="w-4 h-4" />
                  Send Feedback
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
