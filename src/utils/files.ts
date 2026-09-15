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
