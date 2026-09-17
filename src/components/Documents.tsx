import { User } from '../types';

export default function Documents({ user }: { user: User }) {
  return (
    <div className="max-w-6xl mx-auto">
      <h3 className="text-xl font-bold text-white mb-4">Документы и файлы</h3>
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-12 text-center">
        <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <p className="text-gray-500">Раздел документов в разработке</p>
      </div>
    </div>
  );
}
