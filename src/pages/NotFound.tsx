import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 p-4">
      <h1 className="text-3xl font-bold">Halaman tidak ditemukan</h1>
      <Link
        to="/"
        className="inline-flex min-h-16 items-center justify-center rounded-2xl border-2 border-primary-strong bg-primary px-6 text-xl font-bold text-on-primary"
      >
        Kembali ke Beranda
      </Link>
    </main>
  )
}
