'use client';

import Link from 'next/link';
import { useLiff } from '@/components/LiffProvider';

export default function RejectedPage() {
  const { rejectionReason } = useLiff();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="card p-8 max-w-sm w-full text-center">
        {/* バツアイコン */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#FEE2E2] flex items-center justify-center">
          <svg
            className="w-8 h-8 text-[#DC2626]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-[#1E293B] mb-2">
          入会申請が承認されませんでした
        </h1>

        <p className="text-[#64748B] mb-6 text-sm">
          誠に申し訳ございませんが、
          <br />
          今回の入会申請は承認されませんでした。
        </p>

        {rejectionReason && (
          <div className="bg-[#FEF2F2] rounded-lg p-4 mb-6 text-left">
            <p className="text-xs text-[#DC2626] font-medium mb-1">理由</p>
            <p className="text-[#1E293B] text-sm">{rejectionReason}</p>
          </div>
        )}

        <p className="text-xs text-[#64748B] mb-6">
          内容を修正して再申請することができます。
        </p>

        <Link
          href="/apply"
          className="btn-primary inline-block w-full text-center"
        >
          再申請する
        </Link>
      </div>
    </div>
  );
}
