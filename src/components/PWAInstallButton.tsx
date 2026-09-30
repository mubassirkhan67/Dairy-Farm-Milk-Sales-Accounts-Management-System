import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors"
        title="Install Dairy Farm app on your device"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors"
          title="Install on iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl relative border border-neutral-200">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  🐄
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Install Dairy Farm App</h3>
                  <p className="text-xs text-neutral-500">Works offline without internet</p>
                </div>
              </div>
              <div className="space-y-2.5 text-xs text-neutral-700 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-emerald-700 bg-emerald-100 rounded-full w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Tap the <strong>Share</strong> button in your Safari toolbar (the box with an upward arrow).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-emerald-700 bg-emerald-100 rounded-full w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Scroll down the menu and tap <strong>Add to Home Screen</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-emerald-700 bg-emerald-100 rounded-full w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Tap <strong>Add</strong> in the top-right corner. The app will appear on your home screen!</span>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-neutral-900 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
