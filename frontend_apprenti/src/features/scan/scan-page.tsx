'use client';

import * as React from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { IconScan, IconCircleCheck, IconAlertCircle, IconQrcode } from '@tabler/icons-react';

type ScanState = 'idle' | 'scanning' | 'success' | 'error';

export default function ScanPage() {
  const { token } = useAuth();
  const [scanState, setScanState] = React.useState<ScanState>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');
  const [manualCode, setManualCode] = React.useState('');
  const [cameraMode, setCameraMode] = React.useState(false);
  const scannerRef = React.useRef<{ stop: () => Promise<void> } | null>(null);

  async function markAttendance(code: string) {
    if (!token) { setErrorMsg('Non authentifié.'); setScanState('error'); return; }

    const cleaned = code.trim();
    let sessionCode = cleaned;

    // Parse Hodory/MonCNAM QR format
    try {
      const payload = JSON.parse(cleaned);
      if (payload?.session?.code) sessionCode = payload.session.code;
      else if (payload?.code) sessionCode = payload.code;
    } catch {}

    if (!sessionCode) { setErrorMsg('QR code invalide ou vide.'); setScanState('error'); return; }

    setScanState('scanning');
    const res = await apiFetch('/student/attendance/mark', {
      method: 'POST',
      token,
      body: { session_code: sessionCode },
    });

    if (res.ok) {
      setScanState('success');
      toast.success('Présence enregistrée avec succès !');
    } else {
      const msg = (res.data as { detail?: string })?.detail ?? 'Erreur lors de l\'enregistrement.';
      setErrorMsg(msg);
      setScanState('error');
      toast.error(msg);
    }
  }

  async function startCamera() {
    setCameraMode(true);
    setScanState('idle');
    setErrorMsg('');

    // Dynamically import html5-qrcode to avoid SSR issues
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await scanner.stop();
          setCameraMode(false);
          await markAttendance(decodedText);
        },
        () => {}
      );
    } catch (err) {
      setCameraMode(false);
      setErrorMsg("Impossible d'accéder à la caméra. Utilisez le code manuel.");
      setScanState('error');
    }
  }

  function stopCamera() {
    scannerRef.current?.stop().catch(() => {});
    scannerRef.current = null;
    setCameraMode(false);
  }

  function reset() {
    setScanState('idle');
    setErrorMsg('');
    setManualCode('');
  }

  return (
    <div className='max-w-lg mx-auto space-y-6'>
      <div className='rounded-xl border bg-card p-6'>
        <h2 className='font-semibold text-lg mb-1'>Pointer ma présence</h2>
        <p className='text-sm text-muted-foreground'>
          Scannez le QR code affiché en cours ou saisissez le code manuellement.
        </p>
      </div>

      {scanState === 'success' ? (
        <div className='rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 p-8 text-center space-y-3'>
          <IconCircleCheck className='h-12 w-12 text-emerald-600 mx-auto' />
          <h3 className='font-semibold text-lg'>Présence enregistrée !</h3>
          <p className='text-sm text-muted-foreground'>Votre présence a bien été prise en compte.</p>
          <button onClick={reset} className='mt-2 text-sm text-primary hover:underline'>
            Pointer une autre séance
          </button>
        </div>
      ) : scanState === 'error' ? (
        <div className='rounded-xl border bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 p-8 text-center space-y-3'>
          <IconAlertCircle className='h-12 w-12 text-red-600 mx-auto' />
          <h3 className='font-semibold text-lg'>Échec du pointage</h3>
          <p className='text-sm text-muted-foreground'>{errorMsg}</p>
          <button onClick={reset} className='mt-2 text-sm text-primary hover:underline'>
            Réessayer
          </button>
        </div>
      ) : (
        <>
          {/* Camera scanner area */}
          <div className='rounded-xl border bg-card p-4'>
            {cameraMode ? (
              <div className='space-y-3'>
                <div id='qr-reader' className='w-full rounded-lg overflow-hidden' style={{ minHeight: 280 }} />
                <button
                  onClick={stopCamera}
                  className='w-full rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors'
                >
                  Annuler
                </button>
              </div>
            ) : (
              <div className='text-center space-y-4 py-6'>
                <div className='h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mx-auto'>
                  <IconQrcode className='h-10 w-10 text-muted-foreground' />
                </div>
                <div>
                  <p className='text-sm font-medium'>Scanner avec la caméra</p>
                  <p className='text-xs text-muted-foreground mt-1'>
                    Autorisez l&apos;accès à la caméra lorsque demandé.
                  </p>
                </div>
                <button
                  onClick={startCamera}
                  disabled={scanState === 'scanning'}
                  className='flex items-center gap-2 mx-auto rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity'
                >
                  <IconScan className='h-4 w-4' />
                  {scanState === 'scanning' ? 'Enregistrement…' : 'Lancer le scanner'}
                </button>
              </div>
            )}
          </div>

          {/* Manual code entry */}
          <div className='rounded-xl border bg-card p-5 space-y-3'>
            <h3 className='text-sm font-semibold'>Saisie manuelle du code</h3>
            <div className='flex gap-2'>
              <input
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder='Code de séance (ex : AB1234)'
                className='flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                onKeyDown={e => e.key === 'Enter' && manualCode.trim() && markAttendance(manualCode)}
              />
              <button
                onClick={() => markAttendance(manualCode)}
                disabled={!manualCode.trim() || scanState === 'scanning'}
                className='rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity'
              >
                Valider
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
