// Поддерживаемые форматы файлов
export const ALLOWED_EXTENSIONS = {
  documents: ['doc', 'docx', 'xls', 'xlsx', 'pdf', 'txt', 'rtf', 'odt'],
  images: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
  archives: ['zip', 'rar', '7z', 'tar', 'gz'],
  presentations: ['ppt', 'pptx'],
  media: ['mp3', 'mp4', 'avi', 'mkv'],
};

export const ALL_ALLOWED_EXTENSIONS = [
  ...ALLOWED_EXTENSIONS.documents,
  ...ALLOWED_EXTENSIONS.images,
  ...ALLOWED_EXTENSIONS.archives,
  ...ALLOWED_EXTENSIONS.presentations,
  ...ALLOWED_EXTENSIONS.media,
];

// Получение расширения файла
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

// Проверка разрешённого формата
export function isAllowedFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ALL_ALLOWED_EXTENSIONS.includes(ext);
}

// Получение категории файла
export function getFileCategory(filename: string): keyof typeof ALLOWED_EXTENSIONS | 'other' {
  const ext = getFileExtension(filename);
  for (const [category, extensions] of Object.entries(ALLOWED_EXTENSIONS)) {
    if (extensions.includes(ext)) {
      return category as keyof typeof ALLOWED_EXTENSIONS;
    }
  }
  return 'other';
}

// Получение иконки для файла
export function getFileIcon(filename: string): string {
  const category = getFileCategory(filename);
  switch (category) {
    case 'documents':
      return '📄';
    case 'images':
      return '🖼️';
    case 'archives':
      return '📦';
    case 'presentations':
      return '📊';
    case 'media':
      return '🎬';
    default:
      return '📎';
  }
}

// Форматирование размера файла
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Б';
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Чтение файла как Data URL (Base64)
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Скачивание файла
export function downloadFile(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Печать файла
export function printFile(dataUrl: string, filename: string): void {
  const extension = getFileExtension(filename);
  
  // Для изображений
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Печать: ${filename}</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
              img { max-width: 100%; max-height: 100vh; object-fit: contain; }
              @media print {
                body { margin: 0; }
                img { max-width: 100%; max-height: 100%; }
              }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" alt="${filename}" />
            <script>
              window.onload = () => {
                window.print();
                window.onafterprint = () => window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
    return;
  }
  
  // Для PDF
  if (extension === 'pdf') {
    const printWindow = window.open(dataUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    }
    return;
  }
  
  // Для текстовых файлов
  if (['txt', 'rtf'].includes(extension)) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Печать: ${filename}</title>
            <style>
              body { font-family: monospace; padding: 20px; white-space: pre-wrap; }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <iframe src="${dataUrl}" style="width: 100%; height: 100vh; border: none;" onload="this.contentWindow.print()"></iframe>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
    return;
  }
  
  // Для остальных форматов - открываем в новой вкладке (если возможно)
  const printWindow = window.open(dataUrl, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      setTimeout(() => {
        if (confirm(`Файл "${filename}" открыт в новой вкладке. Используйте встроенную функцию печати браузера или сторонней программы.\n\nНажмите OK для открытия диалога печати.`)) {
          printWindow.print();
        }
      }, 1000);
    };
  } else {
    alert(`Не удалось открыть файл для печати. Пожалуйста, скачайте файл и распечатайте его из сторонней программы.`);
  }
}

// Интерфейс для хранения информации о файле
export interface FileData {
  id: string;
  name: string;
  size: number;
  type: string;
  extension: string;
  category: string;
  dataUrl?: string; // Base64 данные (для изображений и небольших файлов)
  uploadedAt: string;
  uploadedBy: string;
}
