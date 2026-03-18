'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';

type Event = {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  location: string | null;
  capacity: number | null;
  fee: number | null;
  registrationUrl: string | null;
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/events');
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events);
        }
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F4F3F0]">
        {/* ヘッダー */}
        <header className="bg-white border-b border-[#D5D5D0] px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-[#2C2C2A]">イベント・セミナー</h1>
            <Link
              href="/projects"
              className="text-sm text-[#0F6E56]"
            >
              案件一覧へ
            </Link>
          </div>
        </header>

        <main className="p-4 pb-24">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F6E56] mx-auto"></div>
              <p className="mt-4 text-[#73726C] text-sm">読み込み中...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-[#73726C]">
              <p>予定されているイベントはありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="card p-4">
                  {/* 日時 */}
                  <div className="flex items-center gap-2 mb-2">
                    <svg
                      className="w-4 h-4 text-[#0F6E56]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-sm text-[#0F6E56] font-medium">
                      {formatDate(event.eventDate)}
                    </span>
                  </div>

                  {/* タイトル */}
                  <h2 className="text-base font-bold text-[#2C2C2A] mb-2">
                    {event.title}
                  </h2>

                  {/* 説明 */}
                  {event.description && (
                    <p className="text-sm text-[#73726C] mb-3 whitespace-pre-wrap">
                      {event.description}
                    </p>
                  )}

                  {/* 詳細情報 */}
                  <div className="space-y-1 text-sm mb-3">
                    {event.location && (
                      <div className="flex items-center gap-2 text-[#73726C]">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.capacity && (
                      <div className="flex items-center gap-2 text-[#73726C]">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <span>定員 {event.capacity}名</span>
                      </div>
                    )}
                    {event.fee !== null && (
                      <div className="flex items-center gap-2 text-[#73726C]">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>
                          {event.fee === 0
                            ? '無料'
                            : `${event.fee.toLocaleString()}円`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 申込ボタン */}
                  {event.registrationUrl && (
                    <a
                      href={event.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary w-full text-center block"
                    >
                      申し込む
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
