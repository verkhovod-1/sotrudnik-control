import { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import {
  getState,
  getConversation,
  sendMessage,
  markMessagesAsRead,
  formatMSKDateTime,
} from '../store';
import SearchBar from './SearchBar';
import FileActions from './FileActions';
import { readFileAsDataURL, formatFileSize, getFileIcon, isAllowedFile } from '../utils/files';

interface ChatProps {
  user: User;
}

export default function Chat({ user }: ChatProps) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<ReturnType<typeof getConversation>>([]);
  const [refresh, setRefresh] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [contactSearch, setContactSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [attachment, setAttachment] = useState<{name: string; size: number; type: string; dataUrl: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const state = getState();
  const otherUsers = state.users.filter((u) => u.id !== user.id);

  // Фильтрация контактов по поиску
  const filteredUsers = contactSearch.trim()
    ? otherUsers.filter((u) => {
        const query = contactSearch.toLowerCase();
        return u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
      })
    : otherUsers;

  // Фильтрация сообщений по поиску (также ищет по вложениям)
  const filteredMessages = messageSearch.trim()
    ? messages.filter((m) => {
        const query = messageSearch.toLowerCase();
        const matchesText = m.text.toLowerCase().includes(query);
        const matchesAttachment = m.attachment?.name.toLowerCase().includes(query);
        return matchesText || matchesAttachment;
      })
    : messages;

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    if (!isAllowedFile(file.name)) {
      alert('Формат файла не поддерживается');
      return;
    }
    
    try {
      const dataUrl = await readFileAsDataURL(file);
      setAttachment({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl,
      });
    } catch (error) {
      console.error('Ошибка чтения файла:', error);
      alert('Ошибка при чтении файла');
    }
    
    // Очищаем input, чтобы можно было выбрать тот же файл снова
    e.target.value = '';
  };

  useEffect(() => {
    if (selectedUser) {
      setMessages(getConversation(user.id, selectedUser));
      markMessagesAsRead(user.id, selectedUser);
    }
  }, [selectedUser, refresh, user.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-refresh messages
  useEffect(() => {
    const interval = setInterval(() => {
      setRefresh((r) => r + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageText.trim() && !attachment) || !selectedUser) return;
    sendMessage({
      senderId: user.id,
      receiverId: selectedUser,
      text: messageText.trim(),
      attachment: attachment || undefined,
    });
    setMessageText('');
    setAttachment(null);
    setRefresh((r) => r + 1);
  };

  const getUnreadForUser = (userId: string) => {
    return state.messages.filter(
      (m) => m.senderId === userId && m.receiverId === user.id && !m.read
    ).length;
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-180px)]">
      <div className="flex bg-white rounded-lg shadow-md h-full overflow-hidden">
        {/* Contacts list */}
        <div className={`w-full md:w-80 border-r border-gray-200 flex flex-col ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-gray-800 font-semibold">Сотрудники</h3>
            <p className="text-gray-600 text-xs mt-1">Выберите сотрудника для чата</p>
            <div className="mt-2">
              <SearchBar
                value={contactSearch}
                onChange={setContactSearch}
                placeholder="Поиск сотрудника..."
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {otherUsers.length === 0 ? 'Пока нет других сотрудников' : 'Ничего не найдено'}
              </div>
            ) : (
              filteredUsers.map((u) => {
                const unread = getUnreadForUser(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                      selectedUser === u.id
                        ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-l-2 border-indigo-500'
                        : 'hover:bg-white/50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {u.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 text-sm font-medium truncate">{u.name}</p>
                      <p className="text-gray-500 text-xs">
                        {u.role === 'director' ? 'Управляющий' : u.role === 'admin' ? 'Администратор' : 'Сотрудник'}
                      </p>
                    </div>
                    {unread > 0 && (
                      <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className={`flex-1 flex flex-col ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
          {!selectedUser ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-gray-500">Выберите сотрудника для начала диалога</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="p-4 border-b border-gray-200 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="md:hidden text-gray-600 hover:text-gray-800"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                    {otherUsers.find((u) => u.id === selectedUser)?.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-gray-800 font-medium text-sm">
                      {otherUsers.find((u) => u.id === selectedUser)?.name}
                    </p>
                    <p className="text-gray-500 text-xs">Личный чат</p>
                  </div>
                </div>
                <SearchBar
                  value={messageSearch}
                  onChange={setMessageSearch}
                  placeholder="Поиск по сообщениям..."
                />
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">
                      {messages.length === 0
                        ? 'Начните диалог'
                        : messageSearch.trim()
                        ? 'Сообщения не найдены'
                        : 'Начните диалог'}
                    </p>
                  </div>
                ) : (
                  filteredMessages.map((msg) => {
                    const isMe = msg.senderId === user.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            isMe
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-md shadow-md'
                              : 'bg-white text-gray-800 rounded-bl-md border border-gray-200'
                          }`}
                        >
                          {msg.text && <p className="text-sm">{msg.text}</p>}
                          {msg.attachment && (
                            <div className={`mt-1 p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-gray-50'}`}>
                              <div className="flex items-center gap-2">
                                <span className="text-lg flex-shrink-0">{getFileIcon(msg.attachment.name)}</span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium truncate">{msg.attachment.name}</p>
                                  <p className={`text-xs ${isMe ? 'text-indigo-100' : 'text-gray-500'}`}>
                                    {formatFileSize(msg.attachment.size)}
                                  </p>
                                </div>
                                <FileActions
                                  dataUrl={msg.attachment.dataUrl}
                                  filename={msg.attachment.name}
                                  compact
                                />
                              </div>
                            </div>
                          )}
                          <p className={`text-xs mt-1 ${isMe ? 'text-indigo-100' : 'text-gray-500'}`}>
                            {formatMSKDateTime(msg.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="p-4 border-t border-gray-200">
                {attachment && (
                  <div className="mb-2 p-2 bg-white border border-gray-200 rounded-lg flex items-center gap-2">
                    <span className="text-lg">{getFileIcon(attachment.name)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 text-sm truncate">{attachment.name}</p>
                      <p className="text-gray-500 text-xs">{formatFileSize(attachment.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      className="text-gray-400 hover:text-red-500 transition"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileAttach}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-600 hover:text-indigo-600 transition rounded-lg hover:bg-white/50"
                    title="Прикрепить файл"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Введите сообщение..."
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition shadow-md"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
