import { useState, useEffect } from 'react';
import { User, Document, DocumentCategory } from '../types';
import { addDocument, getDocumentsByCategory, deleteDocument, formatMSKDateTime, findUserById, getState } from '../store';
import SearchBar from './SearchBar';
import FileUpload, { FileDisplay } from './FileUpload';
import FileActions from './FileActions';
import { readFileAsDataURL, formatFileSize, getFileIcon } from '../utils/files';

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
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (searchQuery.trim()) {
      const allDocs = getState().documents;
      const query = searchQuery.toLowerCase();
      setDocuments(
        allDocs.filter(
          (d) =>
            d.name.toLowerCase().includes(query) ||
            d.fileName.toLowerCase().includes(query)
        )
      );
    } else {
      setDocuments(getDocumentsByCategory(activeCategory));
    }
  }, [activeCategory, searchQuery]);

  const handleDelete = (docId: string) => {
    deleteDocument(docId);
    setDocuments(getDocumentsByCategory(activeCategory));
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-6">
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

        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">
              {searchQuery.trim() ? `Результаты поиска: "${searchQuery}"` : categories.find((c) => c.id === activeCategory)?.label}
            </h3>
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium"
            >
              + Добавить документ
            </button>
          </div>

          <div className="mb-4 max-w-md">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Поиск документов..."
            />
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700/30">
              <p className="text-gray-500">Документов в этой категории пока нет</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => {
                const uploader = findUserById(doc.uploadedBy);
                const icon = getFileIcon(doc.fileName);
                const size = doc.fileSize ? formatFileSize(doc.fileSize) : '';
                
                return (
                  <div
                    key={doc.id}
                    className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-800/70 transition"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <span>{uploader?.name || 'Неизвестно'}</span>
                        <span>•</span>
                        <span>{formatMSKDateTime(doc.uploadedAt)}</span>
                        {size && (
                          <>
                            <span>•</span>
                            <span>{size}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {doc.fileData && (
                      <FileActions dataUrl={doc.fileData} filename={doc.fileName} compact />
                    )}
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

      {showUpload && (
        <UploadDocModal
          user={user}
          category={activeCategory}
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false);
            setDocuments(getDocumentsByCategory(activeCategory));
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<string>('');

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    if (!name) {
      setName(file.name.replace(/\.[^/.]+$/, ''));
    }
    
    try {
      const data = await readFileAsDataURL(file);
      setFileData(data);
    } catch (error) {
      console.error('Ошибка чтения файла:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !selectedFile) return;
    
    addDocument({
      name,
      category,
      uploadedBy: user.id,
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileData: fileData,
      fileType: selectedFile.type,
    });
    onUploaded();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-white mb-4">Добавить документ</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Файл</label>
            <FileUpload onFileSelect={handleFileSelect} />
            {selectedFile && (
              <div className="mt-3">
                <FileDisplay 
                  file={{
                    name: selectedFile.name,
                    size: selectedFile.size,
                  }}
                  onRemove={() => {
                    setSelectedFile(null);
                    setFileData('');
                  }}
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Название документа</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
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
              disabled={!selectedFile}
            >
              Загрузить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
