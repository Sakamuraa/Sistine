# Sistine 🧠💬
Template chatbot AI modern berbasis Next.js dan AI SDK, dirancang untuk membangun aplikasi percakapan cerdas dengan cepat dan fleksibel.

## 🚀 Fitur Utama
- Next.js App Router: Navigasi dinamis dan performa tinggi.
- React Server Components & Server Actions: Rendering sisi server untuk efisiensi maksimal.
- AI SDK: API terpadu untuk teks, objek terstruktur, dan pemanggilan alat dari berbagai LLM.
- Model Provider Fleksibel: Mendukung xAI (default), OpenAI, Fireworks, Anthropic, dan lainnya.
- UI Modern: Menggunakan Tailwind CSS dan komponen shadcn/ui berbasis Radix UI.
- Penyimpanan Data: Neon Serverless Postgres untuk histori chat dan data pengguna.
- Manajemen File: Vercel Blob untuk penyimpanan file yang efisien.
- Autentikasi Aman: Integrasi dengan Auth.js.
## 🧠 Model AI
Sistine menggunakan xAI grok-2-1212 sebagai model default, namun kamu bisa menggantinya dengan OpenAI, Cohere, atau lainnya hanya dengan beberapa baris konfigurasi.
## 🛠️ Instalasi Lokal
``` - Clone repositori:
git clone https://github.com/Sakamuraa/Sistine.git
cd Sistine
- Salin file .env.example menjadi .env dan isi variabel sesuai kebutuhan.
- Instal dependensi:
pnpm install
- Jalankan aplikasi:
pnpm dev
```

## 📄 Lisensi
Cek lisensi di file [LICENSE](https://github.com/Sakamuraa/Sistine/blob/master/LICENSE)
