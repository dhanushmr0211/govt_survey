import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-[#0f172a] px-6 text-white">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-white/10 bg-white shadow-2xl shadow-primary/20">
          <img
            src="/logo.png"
            alt="GovtSurvey Logo"
            className="h-20 w-20 rounded-xl object-cover"
          />
        </div>

        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">New Update Available</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-6 text-slate-300 sm:text-base">
          A new version of the app is ready. Click update to continue.
        </p>

        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="mt-8 w-full rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a]"
        >
          Update Now
        </button>
      </div>
    </div>
  );
}
