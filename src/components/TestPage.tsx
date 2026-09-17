export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Тестовая страница</h1>
        <p className="text-gray-400">Если вы видите эту страницу, значит стили работают</p>
        <div className="mt-8 p-4 bg-blue-500 rounded-lg">
          <p className="text-white">Синяя кнопка</p>
        </div>
      </div>
    </div>
  );
}
