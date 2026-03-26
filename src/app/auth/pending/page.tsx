'use client';

export default function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="card p-8 max-w-sm w-full text-center">
        {/* 時計アイコン */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#FEF3C7] flex items-center justify-center">
          <svg
            className="w-8 h-8 text-[#D97706]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-[#1E293B] mb-2">
          審査中です
        </h1>

        <p className="text-[#64748B] mb-6 text-sm">
          入会申請ありがとうございます。
          <br />
          現在、審査を行っております。
        </p>

        <div className="bg-[#F8FAFC] rounded-lg p-4 mb-6">
          <p className="text-[#64748B] text-xs">
            審査完了後、LINEでお知らせいたします。
            <br />
            しばらくお待ちください。
          </p>
        </div>

        <p className="text-xs text-[#64748B]">
          通常1〜2営業日以内に審査が完了します
        </p>
      </div>
    </div>
  );
}
