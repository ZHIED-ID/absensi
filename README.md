# MeowAbsensi — Cat Edition

Versi perbaikan dari aplikasi absensi PWA berbasis HTML, CSS, dan JavaScript. Struktur alur utama dipertahankan: data diri → hari libur → sakit → izin → foto absensi → hasil/PDF.

## Perubahan utama

- Tema antarmuka cream–orange dengan identitas kucing, kartu yang lebih rapi, dan layout mobile-first.
- OCR tidak lagi bergantung pada satu posisi cap Marki atau garis pemisah vertikal. Aplikasi mencoba membaca seluruh foto, lalu mengulang pembacaan pada area bawah dan kiri-bawah untuk format overlay yang berbeda.
- Parsing tanggal mendukung `DD-MM-YYYY`, `DD/MM/YYYY`, dan `DD.MM.YYYY`.
- Parsing jam memvalidasi format 24 jam `HH:mm`. Pembacaan satu digit yang berisiko kehilangan angka pertama tidak langsung dipercaya.
- Tidak ada fallback otomatis ke `File.lastModified`; waktu file bukan bukti waktu absensi.
- Foto asli dimasukkan ke IndexedDB sebelum OCR dijalankan. Kegagalan OCR atau kegagalan membuat thumbnail tidak menghapus foto.
- Setiap foto dapat dikoreksi: tanggal, jam, jenis foto (masuk/keluar), dan shift.
- Data foto dan koreksi dipulihkan setelah halaman dimuat ulang.
- Service worker dan manifest diperbarui untuk PWA Cat Edition.
- Pengujian parser OCR otomatis tersedia.

## Menjalankan aplikasi

Aplikasi dapat di-host sebagai static site, misalnya GitHub Pages. Buka `index.html` melalui HTTPS atau localhost agar service worker dan IndexedDB dapat bekerja dengan benar.

OCR menggunakan Tesseract.js dari CDN. Koneksi internet diperlukan saat library dan model bahasa pertama kali dimuat. Jika OCR tidak tersedia, unggah foto tetap disimpan dan data tanggal/jam/shift dapat diisi manual.

## Penyimpanan dan privasi

Foto asli dan thumbnail disimpan di IndexedDB pada browser/perangkat yang digunakan. Data tidak dikirim ke server aplikasi. Data ini tidak otomatis tersinkron ke perangkat lain. Jangan menghapus data situs/browser jika foto masih diperlukan. PDF yang diunduh dapat digunakan sebagai salinan laporan, tetapi bukan backup foto asli.

## Uji parser OCR

Membutuhkan Node.js 18 atau lebih baru:

```bash
node --test tests/ocr-regression.test.js
```

Tes mencakup empat format overlay Marki yang diberikan, konflik pembacaan jam, tanggal terpotong, dan nilai waktu/tanggal yang tidak valid.

## Catatan pengujian

Empat foto contoh yang disertakan dalam percakapan digunakan untuk analisis format overlay. Tes otomatis saat ini menguji parser teks dan validasi data, bukan menjamin OCR selalu berhasil pada semua kondisi kamera, resolusi, pencahayaan, atau 50 foto lain. Hasil OCR tetap dapat diedit sebelum laporan diunduh.

### Catatan dari empat foto contoh

Pembacaan lokal awal pada foto contoh menunjukkan:

- `08:58` dan `01-10-2026` dapat dibaca lengkap.
- Foto `15:14` menghasilkan teks jam terpotong (`5:14`) dan tanggal yang tidak lengkap pada pembacaan awal. Sistem tidak mengubahnya menjadi `05:14`; pengguna diminta mengoreksi.
- `23:44` dan `03-10-2026` dapat dibaca lengkap.
- Foto dengan label `Waktu:` / `Tanggal:` menghasilkan tanggal, tetapi jam tidak terdeteksi pada pembacaan awal. Jam diminta diisi manual bila percobaan crop tambahan juga gagal.

Perilaku ini disengaja: data waktu yang tidak pasti tidak boleh disimpan sebagai waktu absensi yang seolah-olah valid.
