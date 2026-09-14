import { useState, useEffect } from 'react';
import { User, Document, DocumentCategory } from '../types';
import { addDocument, getDocumentsByCategory, deleteDocument, formatMSKDateTime, findUserById } from '../store';

interface DocumentsProps {
  user: User;
}

const categories: { id: DocumentCategory; label: string; icon: string }[] = [
  { id: 'contracts', label: 'Договорная документация', icon: '📝' },
  { id: 'reference', label: 'Информационно-справочные документы', icon: '📋' },
  { id: 'local_acts', label: 'Локальные нормативные акты', icon: '📜' },
  { id: 'org_orders', label: 'Организационно-распорядительные документы', icon: '📢' },
  { id: 'payments', label: 'Платёжные документы', icon: '💰' },
  { id: 'other', label: 'Разное', icon: '📁' },
];

export default function Documents({ user }: DocumentsProps) {
  const [activeCategory, setActiveCategory] = useState<DocumentCategory>('contracts');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setDocuments(getDocumentsByCategory(activeCategory));
  }, [activeCategory, refresh]);

  const handleDelete = (docId: string) => {
    deleteDocument(docId);
    setRefresh((r) => r + 1);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Category sidebar */}
        <div className="lg:w-72 flex-shrink-0">
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-3">
            <h3 className="text-white font-semibold mb-3 px-2">Категории документов</h3>
            <div className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition text-sm ${
                    activeCategory === cat.id
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span className="flex-1">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Documents list */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">
              {categories.find((c) => c.id === activeCategory)?.label}
            </h3>
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium"
            >
              + Добавить документ
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700/30">
              <p className="text-gray-500">Документов в этой категории пока нет</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => {
                const uploader = findUserById(doc.uploadedBy);
                return (
                  <div
                    key={doc.id}
                    className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-800/70 transition"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{doc.name}</p>
                      <p className="text-gray-500 text-xs">
                        Загрузил: {uploader?.name || 'Неизвестно'} • {formatMSKDateTime(doc.uploadedAt)}
                      </p>
                    </div>
                    {(doc.uploadedBy === user.id || user.role === 'director' || user.role === 'admin') && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-gray-500 hover:text-red-400 transition p-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <UploadDocModal
          user={user}
          category={activeCategory}
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false);
            setRefresh((r) => r + 1);
          }}
        />
      )}
    </div>
  );
}

function UploadDocModal({
  user,
  category,
  onClose,
  onUploaded,
}: {
  user: User;
  category: DocumentCategory;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [name, setName] = useState('');
  const [fileName, setFileName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    addDocument({
      name,
      category,
      uploadedBy: user.id,
      fileName: fileName || name,
    });
    onUploaded();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-white mb-4">Добавить документ</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Название документа</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Договор №123 от 01.01.2025"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Имя файла (необязательно)</label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="document.pdf"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
            >
              Добавить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
