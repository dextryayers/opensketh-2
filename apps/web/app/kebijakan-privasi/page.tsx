export default function KebijakanPrivasi() {
  return (
    <main className="min-h-screen px-6 py-10 md:px-8 md:py-14 bg-neutral-50 dark:bg-zinc-900 text-gray-800 dark:text-gray-100">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl md:text-3xl font-semibold mb-4">Kebijakan Privasi</h1>
        <p className="text-sm md:text-base leading-relaxed opacity-90 mb-6">
          Terima kasih telah menggunakan OpenSketch. Kami menghormati privasi Anda. Halaman ini menjelaskan bagaimana kami menggunakan cookie dan data terkait.
        </p>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-medium mb-1">1. Penggunaan Cookie</h2>
            <p className="text-sm md:text-[15px] opacity-90">
              Kami menggunakan cookie <strong>esensial</strong> yang diperlukan agar aplikasi berjalan normal (misalnya menyimpan preferensi tertentu). Kami juga dapat menggunakan cookie <strong>opsional</strong> untuk analitik dan peningkatan pengalaman, sesuai persetujuan Anda.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-medium mb-1">2. Persetujuan</h2>
            <p className="text-sm md:text-[15px] opacity-90">
              Saat Anda menekan tombol persetujuan pada banner cookie, kami menyimpan pilihan Anda secara lokal di perangkat (localStorage). Anda dapat menghapus persetujuan dengan menghapus data situs/peramban.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-medium mb-1">3. Data yang Dikumpulkan</h2>
            <p className="text-sm md:text-[15px] opacity-90">
              Jika analitik diaktifkan, data yang terkumpul bersifat agregat (misalnya jumlah kunjungan, perangkat, negara) dan tidak dimaksudkan untuk mengidentifikasi pribadi.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-medium mb-1">4. Perubahan</h2>
            <p className="text-sm md:text-[15px] opacity-90">
              Kebijakan ini dapat diperbarui sewaktu-waktu. Perubahan akan berlaku sejak tanggal diterbitkan.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-medium mb-1">5. Kontak</h2>
            <p className="text-sm md:text-[15px] opacity-90">
              Jika Anda memiliki pertanyaan, silakan hubungi pengelola melalui halaman utama.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
