'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';

export default function Home() {
  const router = useRouter();
  const { isLoading, isLoggedIn, error } = useLiff();

  useEffect(() => {
    if (!isLoading && (isLoggedIn || error)) {
      router.replace('/projects');
    }
  }, [isLoading, isLoggedIn, error, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F3F0]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
        <p className="mt-4 text-gray-600 text-sm">読み込み中...</p>
      </div>
    </div>
  );
}
