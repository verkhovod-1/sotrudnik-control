import { User } from '../types';

export default function Chat({ user }: { user: User }) {
  return (
    <div className="max-w-6xl mx-auto">
      <h3 className="text-xl font-bold text-white mb-4">Чат</h3>
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-12 text-center">
        <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-gray-500">Раздел чата в разработке</p>
      </div>
    </div>
  );
}
