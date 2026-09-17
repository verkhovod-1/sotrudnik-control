import { User } from '../types';

export default function Calendar({ user }: { user: User }) {
  return (
    <div className="max-w-6xl mx-auto">
      <h3 className="text-xl font-bold text-white mb-4">Календарь</h3>
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-12 text-center">
        <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-gray-500">Раздел календаря в разработке</p>
      </div>
    </div>
  );
}
