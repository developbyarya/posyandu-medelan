import { useRegisterSW } from 'virtual:pwa-register/react'
import { BigButton } from './BigButton'
import { StatusBadge } from './StatusBadge'

/**
 * Pemberitahuan siklus hidup service worker.
 *  - `offlineReady`: file aplikasi sudah tersimpan, aman dipakai tanpa internet.
 *  - `needRefresh`: versi baru tersedia. Sengaja TIDAK memuat ulang otomatis supaya
 *    kader tidak kehilangan layar yang sedang diisi.
 */
export function PwaToast() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!offlineReady && !needRefresh) return null

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 border-t-4 border-primary bg-paper p-4 shadow-2xl"
    >
      <div className="mx-auto flex max-w-xl flex-col gap-3">
        {needRefresh ? (
          <>
            <StatusBadge tone="warn">Versi baru aplikasi tersedia</StatusBadge>
            <div className="flex gap-3">
              <BigButton className="flex-1" onClick={() => updateServiceWorker(true)}>
                Perbarui Sekarang
              </BigButton>
              <BigButton variant="secondary" onClick={close}>
                Nanti
              </BigButton>
            </div>
          </>
        ) : (
          <>
            <StatusBadge tone="ok">Siap dipakai tanpa internet</StatusBadge>
            <BigButton variant="secondary" onClick={close}>
              Tutup
            </BigButton>
          </>
        )}
      </div>
    </div>
  )
}
