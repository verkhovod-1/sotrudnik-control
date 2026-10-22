import { useState, useRef } from 'react';
import { isAllowedFile, formatFileSize, getFileIcon, ALL_ALLOWED_EXTENSIONS } from '../utils/files';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  className?: string;
}

export default function FileUpload({ 
  onFileSelect, 
  multiple = false, 
  label = 'Загрузить файл',
  className = ''
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFile = (file: File): boolean => {
    if (!isAllowedFile(file.name)) {
      setError(`Формат файла не поддерживается. Разрешены: ${ALL_ALLOWED_EXTENSIONS.join(', ')}`);
      return false;
    }
    setError('');
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className={className}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
          dragActive
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleChange}
          multiple={multiple}
          className="hidden"
        />
        
        <div className="space-y-2">
          <div className="text-4xl">📁</div>
          <p className="text-gray-700 text-sm">
            Перетащите файл сюда или{' '}
            <button
              type="button"
              onClick={handleButtonClick}
              className="text-indigo-600 hover:text-indigo-800 underline"
            >
              выберите вручную
            </button>
          </p>
          <p className="text-gray-500 text-xs">
            Поддерживаемые форматы: документы, изображения, архивы, презентации, медиа
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}

// Компонент для отображения загруженного файла
interface FileDisplayProps {
  file: {
    name: string;
    size: number;
    dataUrl?: string;
  };
  onRemove?: () => void;
}

export function FileDisplay({ file, onRemove }: FileDisplayProps) {
  const icon = getFileIcon(file.name);
  const size = formatFileSize(file.size);

  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
      <div className="text-2xl flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-800 text-sm font-medium truncate">{file.name}</p>
        <p className="text-gray-500 text-xs">{size}</p>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition p-1"
          title="Удалить"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
