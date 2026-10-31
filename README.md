# Absensi — Cat Edition

Aplikasi absensi PWA (HTML, CSS, JavaScript). Alur: data diri → hari libur → sakit → izin → foto absensi → hasil/PDF.

## OCR bertingkat (cepat dulu, teliti hanya jika perlu)

Cap Marki dibaca dengan tiga tingkat. Foto yang sudah terbaca di tingkat awal tidak melanjutkan ke tingkat berikutnya.

1. **Cepat** – mencari garis pemisah `|` pada cap Marki, memotong baris jam dan baris tanggal saja, lalu membaca keduanya sekaligus dengan whitelist angka. Beberapa posisi pita dan ambang warna dicoba. Biasanya hanya 2 pembacaan kecil.
2. **Area bawah** – tanpa mencari garis pemisah (untuk format overlay lain, mis. label `Waktu:` / `Tanggal:`).
3. **Seluruh foto** – paling lambat; hanya untuk foto yang masih belum menghasilkan tanggal dan jam.

Hasil beberapa pembacaan digabung dengan voting (`MarkiOCR.merge`). Tanggal yang jatuh di bulan yang dipilih diprioritaskan. Jam satu digit (`5:14`, kemungkinan angka depan terpotong) tidak pernah dipercaya sendirian. Jam yang hanya terbaca sekali ditandai "cek lagi" dan shift-nya tetap harus dikonfirmasi.

Worker OCR disiapkan di latar belakang begitu langkah foto dibuka, jadi foto pertama tidak menunggu unduhan model.

## Foto gabungan masuk + pulang

Jika satu gambar berisi dua foto kiri-kanan (mis. "Laporan kerja" Marki), aplikasi mendeteksi jarak putih di tengah, memotongnya menjadi dua foto biasa (kiri = masuk, kanan = pulang), lalu memprosesnya lewat alur OCR yang sama seperti foto lain. Badge/jam hasil OCR tetap diutamakan; urutan kiri/kanan hanya dipakai jika OCR tidak menemukan jenis foto. Jika deteksi otomatis gagal, buka **Periksa / koreksi** → **Pisahkan** (memotong di tengah). Modul: `collage-utils.js`.

## Jika OCR gagal

- Foto asli selalu disimpan ke IndexedDB **sebelum** OCR dijalankan; gagal OCR tidak pernah menghapus foto.
- Foto yang gagal ditandai **Isi manual**. Cukup isi **tanggal** dan pilih **shift**; jam boleh dikosongkan.
- Di halaman hasil, hari yang belum pasti shift-nya menampilkan pilihan shift langsung.
- Foto jam keluar sebelum 06:00 dipasangkan ke hari sebelumnya (shift closing / full shift yang lewat tengah malam).

## Simpan dan lanjutkan lewat PDF

PDF yang diunduh juga berfungsi sebagai **file simpan**. Di langkah pertama (Data diri) pilih **Lanjutkan dari PDF terakhir** untuk memuat kembali data diri, hari libur/sakit/izin, foto beserta tanggal/shift-nya, dan pilihan shift. Setelah itu perbarui "Sampai tanggal", tambahkan foto yang masih kurang, lalu unduh PDF baru.

- Data disematkan di properti PDF (`Keywords`), tidak terlihat di halaman. Ukuran file kira-kira dua kali lipat karena foto disimpan sekali lagi.
- Hanya PDF hasil unduhan versi ini (atau lebih baru) yang bisa dilanjutkan; PDF lama tidak punya data tersebut.
- Foto yang dimuat dari PDF memakai versi thumbnail yang sama dengan isi PDF (bukan foto asli resolusi penuh).
- Isi PDF dianggap tidak tepercaya: semua field divalidasi, dan hanya gambar JPEG data-URL yang diterima.

## PDF

PDF berisi tanggal, status, shift, dan foto. Jam hasil OCR **tidak** dicetak; jam dan tanggal OCR hanya dipakai untuk memastikan tanggal dan shift benar.

## Menjalankan

Host sebagai static site (mis. GitHub Pages) lewat HTTPS atau localhost agar service worker dan IndexedDB bekerja. Tesseract.js dan jsPDF dimuat dari CDN; internet dibutuhkan saat pertama kali.

## Penyimpanan dan privasi

Foto asli dan thumbnail disimpan di IndexedDB pada browser/perangkat yang dipakai. Data tidak dikirim ke server. Jangan menghapus data situs jika foto masih diperlukan. Nama database internal (`meow-absensi-db`) sengaja dipertahankan agar foto yang sudah tersimpan tetap terbaca setelah nama aplikasi diganti.

## Tes parser OCR

Membutuhkan Node.js 18+:

```bash
node --test tests/ocr-regression.test.js
```

Tes mencakup penyimpanan/pemuatan state PDF (`tests/state-utils.test.js`), format overlay Marki, pembacaan baris jam/tanggal, voting antar pembacaan, jam terpotong, tanggal terpotong, dan nilai tidak valid. Tes ini menguji logika teks, bukan keberhasilan OCR pada foto nyata.
