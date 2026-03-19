'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

type AdminAuthGuardProps = {
  children: ReactNode;
};

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // cookieの存在確認（クライアント側ではHttpOnlyのため直接読めないのでAPIで確認）
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/projects?status=pending', {
          method: 'GET',
        });

        if (res.status === 401) {
          setIsAuthenticated(false);
          router.replace('/admin/login');
        } else {
          setIsAuthenticated(true);
        }
      } catch {
        setIsAuthenticated(false);
        router.replace('/admin/login');
      }
    };

    checkAuth();
  }, [router]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F3F0]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F6E56] mx-auto"></div>
          <p className="mt-4 text-[#73726C]">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
