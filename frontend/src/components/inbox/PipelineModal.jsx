import { useGmail } from '../../contexts/GmailContext';

const STAGES = [
  'Connecting to Gmail',
  'Fetching unread emails',
  'Parsing email headers',
  'Extracting features',
  'Running AI classifier',
  'Calculating risk score',
  'Updating dashboard',
];

const PipelineModal = ({ onClose }) => {
  const { syncProgress, syncStage, isSyncing } = useGmail();

  const activeIdx = STAGES.findIndex((s) => s === syncStage);
  const doneIdx   = activeIdx === -1 ? STAGES.length : activeIdx;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {isSyncing ? (
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            ) : (
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            )}
            <h3 className="font-semibold text-gray-800 text-sm">
              {isSyncing ? 'Email Ingestion Pipeline' : 'Sync Complete'}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Stages */}
        <div className="p-4 space-y-1.5">
          {STAGES.map((stage, idx) => {
            const isActive = idx === activeIdx;
            const isDone   = idx < doneIdx || (!isSyncing && syncProgress === 100);
            return (
              <div
                key={stage}
                className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                  isActive ? 'bg-blue-50 border border-blue-200'
                  : isDone  ? 'opacity-70'
                  : 'opacity-30'
                }`}
              >
                {/* Step indicator */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                  isDone   ? 'bg-emerald-500 text-white'
                  : isActive ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-500'
                }`}>
                  {isDone ? '✓' : idx + 1}
                </div>

                <span className={`text-sm flex-1 ${isActive ? 'font-semibold text-blue-700' : 'text-gray-600'}`}>
                  {stage}
                </span>

                {/* Animated dots */}
                {isActive && (
                  <span className="flex gap-0.5 ml-auto">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-4">
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${syncProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            {isSyncing ? `${syncProgress}% complete` : 'Pipeline finished'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PipelineModal;
