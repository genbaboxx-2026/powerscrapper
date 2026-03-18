'use client';

export default function BlockedPage() {
  const handleAddFriend = () => {
    // LINE公式アカウントの友だち追加URL（環境変数で設定）
    const lineOfficialUrl = process.env.NEXT_PUBLIC_LINE_OFFICIAL_URL || 'https://lin.ee/';
    window.location.href = lineOfficialUrl;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F3F0] px-4">
      <div className="card p-8 max-w-sm w-full text-center">
        {/* ロックアイコン */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#E1F5EE] flex items-center justify-center">
          <svg
            className="w-8 h-8 text-[#0F6E56]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-[#2C2C2A] mb-2">
          会員限定サービスです
        </h1>

        <p className="text-[#73726C] mb-6 text-sm">
          PowerScrapper公式LINEを
          <br />
          友だち追加するとご利用いただけます
        </p>

        <button
          onClick={handleAddFriend}
          className="btn-line w-full flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          </svg>
          LINEで友だち追加する
        </button>

        <p className="mt-6 text-xs text-[#73726C]">
          PowerScrapperの集いの参加者・紹介者限定
        </p>
      </div>
    </div>
  );
}
