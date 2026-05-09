import { useGmail } from '../../contexts/GmailContext';

const OnboardingModal = ({ onDismiss }) => {
  const { connectGmail } = useGmail();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white">
          <div className="text-4xl mb-3">🛡️</div>
          <h2 className="text-2xl font-bold">Welcome to SecureGate AI</h2>
          <p className="text-blue-100 text-sm mt-1">Enterprise Email Security Gateway</p>
        </div>

        {/* Steps */}
        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-600 leading-relaxed">
            Connect your Gmail inbox to start automatic AI-powered email threat detection. Setup takes under 30 seconds.
          </p>

          <div className="space-y-3">
            {[
              { n: '1', title: 'Connect Gmail Account',         desc: 'Authorize securely via Google OAuth2' },
              { n: '2', title: 'Allow Inbox Read Permissions',  desc: 'Read-only + label access — no data shared externally' },
              { n: '3', title: 'Start AI Threat Monitoring',    desc: 'Real-time classification begins automatically' },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {n}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{title}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={connectGmail}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-sm shadow-blue-200"
          >
            ✉️ Connect Gmail Now
          </button>

          <button
            onClick={onDismiss}
            className="w-full text-gray-400 hover:text-gray-600 text-sm py-1 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
