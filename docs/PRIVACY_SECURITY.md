# Privasi & Keamanan

## Kontrak privasi

- **Local-first** — teks halaman dan gambar OCR diproses di perangkat Anda.
- **Tidak ada unggahan cloud** — tidak ada endpoint jaringan yang menerima konten halaman. `src/privacy.ts` mendeklarasikan `pageContentSentToCloud: false`.
- **Riwayat mati secara bawaan** — ekstraksi tidak disimpan kecuali pengguna mengaktifkan *Save extraction history locally* (tersimpan di `chrome.storage.local` perangkat).
- **OCR opsional** — model Tesseract diunduh dari CDN pada pemakaian pertama lalu di-cache; proses pengenalan tetap berjalan lokal di perangkat.

## Izin yang diminta (Manifest V3)

| Izin | Alasan |
|---|---|
| `activeTab` | Mengakses tab aktif saat pengguna mengeklik ikon ekstensi |
| `scripting` | Menjalankan/mengelola injeksi pada tab aktif |
| `storage` | Menyimpan pengaturan & hasil lokal |

Content script berjalan di `<all_urls>` agar ekstraksi bekerja di halaman mana pun yang terbuka.

## Batas keamanan & penggunaan yang bertanggung jawab

- Ekstensi **hanya** beroperasi pada konten yang sudah dikirim ke browser. Ia tidak melewati autentikasi, DRM, enkripsi, paywall, atau otorisasi server.
- Ekstraksi dan OCR dimaksudkan untuk konten yang sah Anda akses. Hormati hak cipta dan syarat layanan setiap situs.
- Unlock bersifat sisi-klien dan **reversibel**: CSS dipulihkan pada relock, dan muat ulang halaman mengembalikan kondisi normal sepenuhnya.

## Melaporkan kerentanan

Jika Anda menemukan celah keamanan pada ekstensi ini, mohon jangan membuka *issue* publik terlebih dahulu — hubungi pemelihara melalui jalur pribadi (email di profil repo), sertakan langkah reproduksi dan dampaknya.
