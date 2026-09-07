# Panduan Penggunaan CopyUnlock v0.9.1

## Apa itu CopyUnlock?

CopyUnlock adalah ekstensi browser Google Chrome dan Microsoft Edge (Manifest V3) untuk mengekstrak teks dari halaman web yang sedang tampil, membuka kunci pembatasan salin sisi-klien secara reversibel, dan (opsional) menggunakan OCR lokal bila teks halaman terlalu sedikit.

## Batas penggunaan yang aman

- CopyUnlock hanya bekerja pada konten yang **sudah tampil** di browser Anda.
- Ekstensi ini **bukan** alat untuk melewati autentikasi, DRM, enkripsi, paywall, atau otorisasi server. Hormati hak cipta dan syarat layanan setiap situs.

## Cara memasang

### Di Google Chrome
1. Buka `chrome://extensions`
2. Aktifkan **Developer mode** (pojok kanan atas)
3. Klik **Load unpacked**
4. Pilih folder **`dist/`** hasil build (folder berisi `manifest.json`, `popup.html`, dan lainnya)
5. Sematkan (pin) ikon CopyUnlock di toolbar agar mudah diakses

### Di Microsoft Edge
Caranya sama seperti Chrome, gunakan `edge://extensions`.

### Catatan penting
- Setelah memasang, **muat ulang (refresh)** halaman yang sudah terbuka agar ekstensi aktif di halaman tersebut.
- Ikon harus berwarna (tidak abu-abu) saat berada di halaman web biasa.

## Menggunakan ekstensi

1. Buka halaman yang ingin diambil teksnya (artikel, blog, dokumen web, dan lain-lain).
2. Klik ikon CopyUnlock di toolbar.
3. Klik **Analyze page** (opsional) untuk memeriksa apakah halaman memblokir seleksi, klik kanan, atau salin.
4. Klik **Extract text** untuk mulai mengekstrak.
5. Hasil ditampilkan: metode ekstraksi (`DOM`, `DOM+OCR`, atau `OCR`), tingkat keyakinan, jumlah kata, dan kontennya.
6. Gunakan tab **Text** atau **Markdown** untuk melihat format berbeda.
7. Salin hasil ke clipboard lewat tombol **Copy**, atau unduh sebagai file **TXT** / **Markdown**.

## Saat halaman memblokir salin

- **Auto-unlock** (aktif secara bawaan) menghapus pembatasan seleksi sisi-klien saat ekstraksi, sehingga teks juga dapat diseleksi dan disalin manual.
- Untuk mengembalikan kondisi halaman seperti semula, **muat ulang halaman** tersebut.

## OCR fallback (opsional)

- Buka popup, centang **Enable local OCR fallback**.
- Pilih bahasa: **English**, **Indonesia**, atau **English + Indonesia**.
- OCR hanya dipakai bila teks dari DOM berada di bawah ambang kualitas (misalnya konten berupa gambar teks).
- Saat pertama kali dipakai, ekstensi mengunduh model bahasa (~10 MB per bahasa) dari CDN lalu menyimpannya sebagai cache — diperlukan koneksi internet satu kali.
- Untuk menghentikan proses OCR, klik **Cancel** — status berubah menjadi **Cancelled**.

## Bila terjadi error

- **Retry** — mengulangi ekstraksi.
- **DOM only** — mengekstrak tanpa OCR (pilihan pemulihan bila OCR bermasalah).

## Pengaturan (disimpan lokal)

| Pengaturan | Fungsi | Bawaan |
|---|---|---|
| Auto-unlock client-side copy restrictions | Otomatis membuka kunci pembatasan salin saat ekstraksi | Aktif |
| Enable local OCR fallback | Mengaktifkan OCR | Mati |
| OCR language | Pilihan bahasa OCR (`eng`, `ind`, `eng+ind`) | `eng` |
| Save extraction history locally | Menyimpan hasil terakhir | Mati |
| Theme | System / Light / Dark | System |

Semua pengaturan disimpan di `chrome.storage.local` perangkat Anda.

## Privasi

- Teks halaman dan gambar OCR diproses di perangkat Anda. Tidak ada pengunggahan ke cloud.
- Riwayat ekstraksi dalam keadaan **mati** secara bawaan.
- Tidak ada endpoint jaringan yang menerima data konten halaman.

## Pemecahan masalah cepat

| Gejala | Solusi |
|---|---|
| Ikon abu-abu / tidak merespons | Pastikan berada di halaman `http/https` biasa (bukan `chrome://`, `edge://`, atau halaman toko); muat ulang halaman; pastikan ekstensi tidak dimatikan |
| Pesan *"This page cannot be scripted"* | Halaman khusus seperti `chrome://` tidak mengizinkan ekstensi; gunakan halaman web biasa |
| OCR gagal saat pertama kali | Pastikan ada koneksi internet untuk mengunduh model, lalu coba lagi |
| Hasil terasa kurang lengkap | Coba tombol **DOM only**, atau muat ulang halaman lalu ekstrak ulang |
| Teks belum bisa diseleksi setelah unlock | Muat ulang halaman; sebagian situs memakai pembatasan tambahan — reload selalu mengembalikan kondisi normal |
