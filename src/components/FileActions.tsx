import { downloadFile, printFile } from '../utils/files';

interface FileActionsProps {
  dataUrl: string;
  filename: string;
  compact?: boolean;
}

export default function FileActions({ dataUrl, filename, compact = false }: FileActionsProps) {
  const handleDownload = () => {
    downloadFile(dataUrl, filename);
  };

  const handlePrint = () => {
    printFile(dataUrl, filename);
  };

  if (compact) {
    return (
      <div className="flex gap-1">
        <button
          onClick={handleDownload}
          className="text-gray-400 hover:text-indigo-600 transition p-1"
          title="Скачать"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
        <button
          onClick={handlePrint}
          className="text-gray-400 hover:text-green-600 transition p-1"
          title="Печать"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleDownload}
        className="flex items-center gap-2 px-3 py-2 bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-200 transition text-sm"
        title="Скачать файл"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Скачать
      </button>
      <button
        onClick={handlePrint}
        className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 border border-green-200 rounded-lg hover:bg-green-200 transition text-sm"
        title="Печать файла"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Печать
      </button>
    </div>
  );
}
