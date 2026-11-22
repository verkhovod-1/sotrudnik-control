
import { useState, useEffect, useRef } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import SearchBar from './SearchBar';
import {
  formatMSKDateTime,
} from '../store';
import {
  formatFileSize,
  getFileIcon,
  isAllowedFile,
} from '../utils/files';

interface ChatProps {
  user: User;
}

interface ContactRow {
  id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string;
}

interface AttachmentData {
  name: string;
  size: number;
  type: string;
  file_path: string;
  signedUrl?: string;
}

interface MessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  timestamp: string;
  read: boolean;
  attachment?: AttachmentData | null;
}

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  read: boolean;
  attachment?: AttachmentData;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  role: string;
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]/g, '_');
}

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    text: row.text || '',
    timestamp: row.timestamp,
    read: row.read,
    attachment: row.attachment || undefined,
  };
}

export default function Chat({ user }: ChatProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const [messageText, setMessageText] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');

  const [attachment, setAttachment] = useState<File | null>(null);

  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function loadContacts() {
    const { data, error: contactsError } = await supabase.rpc(
      'get_chat_contacts'
    );

    if (contactsError) {
      console.error('Ошибка загрузки сотрудников:', contactsError);
      setError('Не удалось загрузить список сотрудников.');
      setLoadingContacts(false);
      return;
    }

    const options: Contact[] = ((data || []) as ContactRow[])
      .filter((row) => row.id && row.id !== user.id)
      .map((row) => ({
        id: row.id,
        name: row.full_name || row.name || row.email || 'Сотрудник',
        email: row.email || '',
        role: row.role || 'employee',
      }));

    setContacts(options);
    setLoadingContacts(false);
  }

  async function loadUnreadCounts() {
    const { data, error: unreadError } = await supabase
      .from('chat_messages')
      .select('sender_id')
      .eq('receiver_id', user.id)
      .eq('read', false);

    if (unreadError) {
      console.error('Ошибка загрузки непрочитанных сообщений:', unreadError);
      return;
    }

    const counts: Record<string, number> = {};

    (data || []).forEach((row: { sender_id: string }) => {
      counts[row.sender_id] = (counts[row.sender_id] || 0) + 1;
    });

    setUnreadCounts(counts);
  }

  async function markConversationAsRead(contactId: string) {
    const { error: readError } = await supabase
      .from('chat_messages')
      .update({ read: true })
      .eq('sender_id', contactId)
      .eq('receiver_id', user.id)
      .eq('read', false);

    if (readError) {
      console.error('Ошибка отметки прочитанных сообщений:', readError);
    }

    await loadUnreadCounts();
  }

  async function loadConversation(contactId: string) {
    setLoadingMessages(true);

    const { data, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id})`
      )
      .order('timestamp', { ascending: true });

    if (messagesError) {
      console.error('Ошибка загрузки переписки:', messagesError);
      setError('Не удалось загрузить сообщения.');
      setLoadingMessages(false);
      return;
    }

    const rows = (data || []) as MessageRow[];

    const mapped = await Promise.all(
      rows.map(async (row) => {
        const message = mapMessage(row);

        if (message.attachment?.file_path) {
          const { data: signedData, error: signedError } =
            await supabase.storage
              .from('synchron-chat')
              .createSignedUrl(message.attachment.file_path, 3600);

          if (!signedError && signedData) {
            message.attachment.signedUrl = signedData.signedUrl;
          }
        }

        return message;
      })
    );

    setMessages(mapped);
    setLoadingMessages(false);

    const hasUnread = rows.some(
      (row) => row.sender_id === contactId && !row.read
    );

    if (hasUnread) {
      await markConversationAsRead(contactId);
    }
  }

  useEffect(() => {
    loadContacts();
    loadUnreadCounts();
  }, [user.id]);

  useEffect(() => {
    if (!selectedUser) {
      setMessages([]);
      return;
    }

    setError('');
    loadConversation(selectedUser);

    const interval = setInterval(() => {
      loadConversation(selectedUser);
      loadUnreadCounts();
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedUser, user.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages]);

  const filteredContacts = contacts.filter((contact) => {
    const query = contactSearch.trim().toLowerCase();

    if (!query) return true;

    return (
      contact.name.toLowerCase().includes(query) ||
      contact.email.toLowerCase().includes(query)
    );
  });

  const filteredMessages = messages.filter((message) => {
    const query = messageSearch.trim().toLowerCase();

    if (!query) return true;

    return (
      message.text.toLowerCase().includes(query) ||
      message.attachment?.name.toLowerCase().includes(query)
    );
  });

  const selectedContact = contacts.find(
    (contact) => contact.id === selectedUser
  );

  const handleFileAttach = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!isAllowedFile(file.name)) {
      alert('Формат файла не поддерживается');
      event.target.value = '';
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert('Размер файла не должен превышать 25 МБ');
      event.target.value = '';
      return;
    }

    setAttachment(file);
    event.target.value = '';
  };

  async function handleSend(event: FormEvent) {
    event.preventDefault();

    if ((!messageText.trim() && !attachment) || !selectedUser || sending) {
      return;
    }

    setSending(true);
    setError('');

    let attachmentData: AttachmentData | null = null;
    let uploadedPath: string | null = null;

    try {
      // Сначала загружаем вложение, если оно есть.
      if (attachment) {
        const filePath =
          `${user.id}/${crypto.randomUUID()}-${safeFileName(attachment.name)}`;

        const { error: uploadError } = await supabase.storage
          .from('synchron-chat')
          .upload(filePath, attachment, {
            contentType: attachment.type || 'application/octet-stream',
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        uploadedPath = filePath;

        attachmentData = {
          name: attachment.name,
          size: attachment.size,
          type: attachment.type,
          file_path: filePath,
        };
      }

      const { error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedUser,
          text: messageText.trim(),
          read: false,
          attachment: attachmentData,
        });

      if (insertError) {
        throw insertError;
      }

      setMessageText('');
      setAttachment(null);

      await loadConversation(selectedUser);
      await loadUnreadCounts();
    } catch (sendError) {
      console.error('Ошибка отправки сообщения:', sendError);

      // Если сообщение не сохранилось, удаляем уже загруженный файл.
      if (uploadedPath) {
        const { error: removeError } = await supabase.storage
          .from('synchron-chat')
          .remove([uploadedPath]);

        if (removeError) {
          console.error('Не удалось удалить загруженное вложение:', removeError);
        }
      }

      setError('Не удалось отправить сообщение. Попробуйте ещё раз.');
    } finally {
      setSending(false);
    }
  }

  async function handleDownload(file: AttachmentData) {
    if (!file.signedUrl) {
      setError('Не удалось получить ссылку на файл. Обновите переписку.');
      return;
    }

    try {
      const response = await fetch(file.signedUrl);

      if (!response.ok) {
        throw new Error('Ошибка загрузки файла');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error('Ошибка скачивания файла:', downloadError);
      setError('Не удалось скачать файл.');
    }
  }

  function getRoleName(role: string) {
    if (role === 'director') return 'Управляющий';
    if (role === 'admin') return 'Администратор';
    return 'Сотрудник';
  }

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-180px)]">
      <div className="flex card-light rounded-xl h-full overflow-hidden">

        {/* Список сотрудников */}
        <div
          className={`w-full md:w-80 border-r border-gray-200 flex flex-col ${
            selectedUser ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-gray-800 font-semibold">
              Сотрудники
            </h3>

            <p className="text-gray-600 text-xs mt-1">
              Выберите сотрудника для чата
            </p>

            <div className="mt-2">
              <SearchBar
                value={contactSearch}
                onChange={setContactSearch}
                placeholder="Поиск сотрудника..."
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingContacts ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Загрузка сотрудников...
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {contacts.length === 0
                  ? 'Пока нет других сотрудников'
                  : 'Ничего не найдено'}
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const unread = unreadCounts[contact.id] || 0;

                return (
                  <button
                    key={contact.id}
                    onClick={() => {
                      setSelectedUser(contact.id);
                      setMessageSearch('');
                      setError('');
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                      selectedUser === contact.id
                        ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-l-2 border-indigo-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 text-sm font-medium truncate">
                        {contact.name}
                      </p>

                      <p className="text-gray-500 text-xs">
                        {getRoleName(contact.role)}
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

        {/* Окно переписки */}
        <div
          className={`flex-1 flex flex-col ${
            !selectedUser ? 'hidden md:flex' : 'flex'
          }`}
        >
          {!selectedUser ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <svg
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>

                <p className="text-gray-500">
                  Выберите сотрудника для начала диалога
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-200 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="md:hidden text-gray-600 hover:text-gray-800"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>

                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                    {selectedContact?.name.charAt(0).toUpperCase() || '?'}
                  </div>

                  <div>
                    <p className="text-gray-800 font-medium text-sm">
                      {selectedContact?.name || 'Сотрудник'}
                    </p>

                    <p className="text-gray-500 text-xs">
                      Личный чат
                    </p>
                  </div>
                </div>

                <SearchBar
                  value={messageSearch}
                  onChange={setMessageSearch}
                  placeholder="Поиск по сообщениям..."
                />
              </div>

              {error && (
                <div className="mx-4 mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    Загрузка сообщений...
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">
                      {messageSearch.trim()
                        ? 'Сообщения не найдены'
                        : 'Начните диалог'}
                    </p>
                  </div>
                ) : (
                  filteredMessages.map((msg) => {
                    const isMe = msg.senderId === user.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${
                          isMe ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            isMe
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-md shadow-md'
                              : 'bg-white text-gray-800 rounded-bl-md border border-gray-200'
                          }`}
                        >
                          {msg.text && (
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.text}
                            </p>
                          )}

                          {msg.attachment && (
                            <div
                              className={`mt-1 p-2 rounded-lg ${
                                isMe ? 'bg-white/20' : 'bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-lg flex-shrink-0">
                                  {getFileIcon(msg.attachment.name)}
                                </span>

                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium truncate">
                                    {msg.attachment.name}
                                  </p>

                                  <p
                                    className={`text-xs ${
                                      isMe
                                        ? 'text-indigo-100'
                                        : 'text-gray-500'
                                    }`}
                                  >
                                    {formatFileSize(msg.attachment.size)}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    msg.attachment &&
                                    handleDownload(msg.attachment)
                                  }
                                  className={`text-xs underline ${
                                    isMe
                                      ? 'text-white'
                                      : 'text-indigo-600'
                                  }`}
                                  title="Скачать файл"
                                >
                                  Скачать
                                </button>
                              </div>
                            </div>
                          )}

                          <p
                            className={`text-xs mt-1 ${
                              isMe
                                ? 'text-indigo-100'
                                : 'text-gray-500'
                            }`}
                          >
                            {formatMSKDateTime(msg.timestamp)}
                            {isMe && msg.read ? ' ✓✓' : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}

                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSend}
                className="p-4 border-t border-gray-200"
              >
                {attachment && (
                  <div className="mb-2 p-2 bg-white border border-gray-200 rounded-lg flex items-center gap-2">
                    <span className="text-lg">
                      {getFileIcon(attachment.name)}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 text-sm truncate">
                        {attachment.name}
                      </p>

                      <p className="text-gray-500 text-xs">
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      className="text-gray-400 hover:text-red-500 transition"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
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
                    className="p-2 text-gray-600 hover:text-indigo-600 transition rounded-lg hover:bg-gray-50"
                    title="Прикрепить файл"
                    disabled={sending}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                  </button>

                  <input
                    type="text"
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    className="flex-1 min-w-0 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Введите сообщение..."
                  />

                  <button
                    type="submit"
                    disabled={
                      sending ||
                      (!messageText.trim() && !attachment)
                    }
                    className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition shadow-md disabled:opacity-50"
                  >
                    {sending ? (
                      '...'
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                    )}
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
