# 🏙️ SmartRoad 2D — Visualisasi Peta Spasial Perkotaan dengan Animasi Kendaraan

<div align="center">

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

**Projek Akhir Mata Kuliah | Grafika Komputer INF11114**  
Universitas Maritim Raja Ali Haji (UMRAH)  
Fakultas Teknik dan Teknologi Kemaritiman

🔗 **[Live Demo](https://2401020067-syharasuheti.github.io/SMARTROAD-2D-Visualisasi-Peta-Spasial-Perkotaan-2D-dengan-Animasi-Kendaraan/)**

</div>

---

## 📋 Deskripsi Projek

**SmartRoad 2D** adalah aplikasi visualisasi peta spasial perkotaan berbasis web yang dibangun menggunakan **HTML5 Canvas API**. Sistem ini menampilkan kota virtual 2D dengan jaringan jalan acak (*procedurally generated*), gedung-gedung, pohon tepi jalan, bundaran, dan animasi kendaraan yang bergerak menyusuri rute hasil kalkulasi algoritma pencarian.

Tersedia dua mode algoritma yang dapat dipilih pengguna secara langsung:
- **BFS (Breadth-First Search)** — menjamin jalur dengan jumlah simpang (*hop*) paling sedikit.
- **DFS (Depth-First Search)** — menghasilkan jalur alternatif yang lebih eksploratif.

Projek ini dikembangkan sebagai media pembelajaran interaktif dalam mata kuliah **Grafika Komputer INF11114**, memadukan konsep rendering 2D, struktur data graf, dan animasi real-time dalam satu aplikasi browser.

---

## 🚨 Latar Permasalahan

Pertumbuhan kota yang pesat menimbulkan tantangan besar dalam pengelolaan transportasi dan navigasi perkotaan. Beberapa permasalahan utama yang melatarbelakangi projek ini antara lain:

1. **Kompleksitas Jaringan Jalan** — Jaringan jalan perkotaan terdiri dari ratusan hingga ribuan simpul (*node*) dan jalur (*edge*) yang saling terhubung secara tidak beraturan. Menentukan rute secara manual menjadi tidak efisien dan rawan kesalahan.

2. **Kebutuhan Visualisasi Algoritma** — Algoritma pencarian jalur seperti BFS dan DFS seringkali sulit dipahami hanya melalui pseudocode atau deskripsi teks. Mahasiswa dan pelajar membutuhkan media visual yang interaktif untuk memahami cara kerja algoritma ini secara intuitif.

3. **Kurangnya Media Simulasi Berbasis Web** — Sebagian besar alat visualisasi algoritma graf yang tersedia bersifat generik dan tidak merepresentasikan konteks nyata seperti navigasi kota. Hal ini membuat pembelajaran menjadi kurang menarik dan tidak kontekstual.

4. **Keterbatasan Aksesibilitas** — Banyak simulasi serupa memerlukan instalasi perangkat lunak tambahan atau koneksi ke server backend, sehingga menyulitkan pengguna yang hanya memiliki browser standar.

Berdasarkan permasalahan di atas, dibutuhkan sebuah sistem simulasi pencarian rute yang **mudah diakses, visual, interaktif, dan mampu merepresentasikan kondisi jaringan jalan perkotaan secara realistis** tanpa ketergantungan pada infrastruktur server.

---

## 📖 Latar Belakang

Perkembangan teknologi informasi membuka peluang besar dalam pengembangan sistem navigasi berbasis komputer. Konsep *Smart City* yang semakin populer mendorong penerapan algoritma cerdas dalam pengelolaan infrastruktur kota, termasuk sistem transportasi.

Dalam ilmu komputer, permasalahan pencarian jalur pada jaringan jalan dapat dimodelkan sebagai masalah pencarian pada **graf tidak berbobot atau berbobot**, di mana:
- **Node** merepresentasikan persimpangan atau titik lokasi.
- **Edge** merepresentasikan ruas jalan yang menghubungkan dua persimpangan.

Dua algoritma klasik yang paling fundamental dalam pencarian jalur pada graf adalah:

- **BFS (Breadth-First Search)**, pertama kali diperkenalkan oleh Konrad Zuse (1945) dan dikembangkan lebih lanjut oleh Edward F. Moore (1959), bekerja dengan menjelajahi semua simpul pada kedalaman (*level*) yang sama sebelum berpindah ke level berikutnya. Pada graf tidak berbobot, BFS **menjamin jalur dengan jumlah lompatan (hop) paling sedikit**.

- **DFS (Depth-First Search)**, yang ditelusuri penggunaannya hingga abad ke-19 oleh matematikawan Prancis Charles Pierre Trémaux dalam konteks penjelajahan labirin, bekerja dengan menjelajahi cabang jalur sedalam mungkin sebelum melakukan *backtrack*. DFS **tidak menjamin jalur terpendek**, namun sangat berguna untuk eksplorasi jalur alternatif dan analisis konektivitas graf.

Kedua algoritma ini menjadi fondasi bagi algoritma-algoritma navigasi modern seperti Dijkstra, A\*, dan Bidirectional Search yang digunakan dalam sistem navigasi nyata (Google Maps, Waze, dll.).

Projek **SmartRoad 2D** hadir sebagai implementasi visual dari kedua algoritma tersebut dalam konteks peta kota 2D yang dirender menggunakan HTML5 Canvas. Peta kota dibangkitkan secara prosedural menggunakan **algoritma Spanning Tree (Kruskal)** dengan penambahan edge acak untuk menghasilkan jaringan jalan yang realistis namun selalu terhubung penuh (*connected*). Kendaraan kemudian dianimasikan bergerak menyusuri jalur hasil kalkulasi dengan *smooth corner interpolation* menggunakan waypoint berbasis segmen garis dan busur lingkaran.

---

## 🧮 Analisis Kompleksitas Algoritma

### 1. Kompleksitas BFS (Breadth-First Search)

BFS menggunakan antrian (*queue*) dan menjelajahi semua node berdasarkan jarak hop dari node asal.

**Representasi Graf:**
- $V$ = jumlah node (simpul) = $R \times C$ = $8 \times 8 = 64$
- $E$ = jumlah edge (sisi) pada peta yang digenerate

**Kompleksitas Waktu:**

$$T_{BFS} = O(V + E)$$

Setiap node dikunjungi tepat satu kali dan setiap edge diperiksa maksimal dua kali (dua arah). Pada implementasi ini, path langsung disimpan dalam queue sehingga terdapat overhead penyalinan array sebesar $O(V)$ per langkah, memberikan kompleksitas total:

$$T_{BFS\ aktual} = O(V \cdot (V + E))$$

Namun dalam praktiknya, pencarian berhenti segera setelah node tujuan ditemukan, sehingga rata-rata jauh lebih cepat dari kasus terburuk.

**Kompleksitas Ruang:**

$$S_{BFS} = O(V)$$

Queue menyimpan maksimal seluruh node pada satu level, dan visited set menyimpan node yang sudah dikunjungi.

**Jaminan Optimalitas:** ✅ BFS **menjamin jalur dengan jumlah hop (simpang) paling sedikit** pada graf tidak berbobot.

---

### 2. Kompleksitas DFS (Depth-First Search)

DFS menggunakan rekursi (stack implisit) dan menjelajahi setiap cabang sedalam mungkin.

**Kompleksitas Waktu:**

$$T_{DFS} = O(V + E)$$

Dalam implementasi ini, urutan tetangga diacak (*shuffle*) sebelum dijelajahi untuk menghasilkan jalur alternatif yang bervariasi setiap kali dipanggil.

**Kompleksitas Ruang:**

$$S_{DFS} = O(V)$$

Stack rekursi dapat sedalam jumlah node pada jalur terpanjang, ditambah visited set.

**Jaminan Optimalitas:** ❌ DFS **tidak menjamin jalur terpendek**. Jalur yang ditemukan bergantung pada urutan eksplorasi tetangga (yang diacak), sehingga menghasilkan jalur alternatif yang berbeda-beda dan lebih panjang dari jalur optimal BFS.

---

### 3. Kompleksitas Pembangkitan Peta (Map Generation)

Peta dibangkitkan menggunakan modifikasi **Algoritma Kruskal** untuk memastikan konektivitas penuh.

| Tahap | Algoritma | Kompleksitas Waktu | Kompleksitas Ruang |
|---|---|---|---|
| Inisialisasi Node | — | $O(V)$ | $O(V)$ |
| Spanning Tree (Union-Find) | Kruskal + Path Compression | $O(E \cdot \alpha(V))$ | $O(V)$ |
| Penambahan Edge Ekstra | Shuffle + Filter | $O(E \log E)$ | $O(E)$ |
| Penempatan Bundaran | Linear scan | $O(V)$ | $O(B)$ |
| City Blocks & Gedung | Per-sel grid | $O((R-1)(C-1) \cdot k)$ | $O(G)$ |
| Street Trees | Per-edge | $O(E \cdot n)$ | $O(T)$ |

Keterangan: $\alpha$ = fungsi invers Ackermann (hampir konstan), $B$ = jumlah bundaran, $G$ = jumlah gedung, $T$ = jumlah pohon.

---

### 4. Kompleksitas Sistem Animasi (Waypoint Generation)

Proses pembangunan waypoint dari jalur node menggunakan interpolasi segmen dan busur:

$$T_{waypoints} = O(|path| \cdot \frac{L_{avg}}{4})$$

Di mana $|path|$ adalah jumlah node pada jalur dan $L_{avg}$ adalah panjang rata-rata segmen jalan. Setiap frame animasi berjalan dalam $O(1)$ karena hanya memperbarui posisi kendaraan satu langkah ke depan.

**Render Loop** berjalan pada ~60 FPS dengan kompleksitas per-frame:

$$T_{frame} = O(E + G + T + V)$$

---

### 5. Perbandingan Kompleksitas

| Aspek | BFS | DFS |
|---|---|---|
| Kompleksitas Waktu | $O(V + E)$ | $O(V + E)$ |
| Kompleksitas Ruang | $O(V)$ | $O(V)$ |
| Jaminan Jalur Terpendek | ✅ Ya (hop minimum) | ❌ Tidak |
| Cocok untuk | Navigasi optimal | Eksplorasi jalur alternatif |
| Variasi hasil | Deterministik | Non-deterministik (acak) |

Pada peta 8×8 dengan $V = 64$ node dan rata-rata $E \approx 80$–$110$ edge, kedua algoritma berjalan sangat cepat (< 1ms) sehingga perbedaan performa tidak terasa. Perbedaan yang signifikan terletak pada **kualitas jalur yang dihasilkan**.

---

## 🎯 Tujuan

1. Mengimplementasikan algoritma BFS dan DFS pada representasi graf jaringan jalan perkotaan berbasis web.
2. Memvisualisasikan perbedaan hasil pencarian jalur antara BFS (jalur terpendek) dan DFS (jalur alternatif) secara interaktif.
3. Menampilkan animasi pergerakan kendaraan yang halus (*smooth*) menggunakan interpolasi waypoint dengan *corner rounding* dan navigasi bundaran.
4. Membangkitkan peta kota 2D secara prosedural yang selalu terhubung penuh dan bervariasi setiap kali di-generate.
5. Mengembangkan keterampilan implementasi grafika komputer 2D menggunakan HTML5 Canvas API.
6. Mengintegrasikan konsep struktur data (graf, queue, stack, union-find) dengan visualisasi interaktif berbasis web.

---

## 🚀 Demo & Cara Menjalankan

### Prasyarat
Tidak diperlukan instalasi atau server backend. Cukup browser modern yang mendukung HTML5 Canvas.

### Akses Langsung
🔗 **[https://2401020067-syharasuheti.github.io/SMARTROAD-2D-Visualisasi-Peta-Spasial-Perkotaan-2D-dengan-Animasi-Kendaraan/](https://2401020067-syharasuheti.github.io/SMARTROAD-2D-Visualisasi-Peta-Spasial-Perkotaan-2D-dengan-Animasi-Kendaraan/)**

### Menjalankan Secara Lokal
```bash
# Clone repositori ini
git clone https://github.com/2401020067-syharasuheti/SMARTROAD-2D-Visualisasi-Peta-Spasial-Perkotaan-2D-dengan-Animasi-Kendaraan.git

# Buka file langsung di browser
# Double-click index.html
# atau gunakan Live Server (VS Code Extension)
```

> ✅ **Tidak memerlukan Node.js, Python, atau backend apapun.** Seluruh logika berjalan di sisi klien (browser).

---

## 🗂️ Struktur Direktori

```
📁 project/
├── index.html      # Halaman utama & struktur UI
├── style.css       # Styling antarmuka (tema dark/modern)
├── app.js          # Logika utama: graph, BFS/DFS, rendering, animasi
└── README.md       # Dokumentasi projek
```

---

## 🛠️ Teknologi yang Digunakan

| Teknologi | Fungsi |
|---|---|
| **HTML5** | Struktur halaman web & elemen Canvas |
| **CSS3** | Desain antarmuka dark mode, layout responsif |
| **JavaScript (ES6+)** | Logika BFS/DFS, rendering Canvas, animasi kendaraan, interaksi pengguna |
| **HTML5 Canvas API** | Rendering peta 2D, gedung, jalan, kendaraan, pohon |
| **Google Fonts** | Tipografi (Inter & JetBrains Mono) |

---

## ⚙️ Fitur Sistem

### 🗺️ Peta Kota Virtual (Procedural Generation)
- Grid **8×8** simpul dengan jarak antar simpul 200 unit
- Jaringan jalan dibangkitkan menggunakan **Spanning Tree (Union-Find/Kruskal)** + penambahan edge acak (~35% dari edge yang tersisa) untuk menciptakan variasi rute
- Hingga **6 bundaran** (*roundabout*) ditempatkan secara otomatis pada persimpangan dengan degree ≥ 3 dan jarak antar bundaran minimal 3 sel
- Gedung prosedural dengan 5 tipe: Kantor, Toko, Apartemen, Rumah, Gudang
- Pohon tepi jalan ditempatkan di sepanjang ruas jalan, menghindari area bundaran

### 🔍 Algoritma Pencarian
- **BFS** — Breadth-First Search, menjamin jalur dengan hop paling sedikit
- **DFS** — Depth-First Search dengan pengacakan urutan tetangga, menghasilkan jalur alternatif
- Dapat dipilih dan diganti secara real-time melalui dropdown

### 🚗 Simulasi Kendaraan
- Kendaraan bergerak mulus mengikuti waypoint dengan **smooth corner interpolation** (busur lingkaran radius 22px pada tikungan)
- Navigasi bundaran menggunakan arc melingkar sesuai arah masuk–keluar
- Panel status menampilkan algoritma aktif, jumlah node, edge, gedung, dan panjang jalur

### 🎮 Kontrol Interaktif
- **▶ Start** / **⏸ Pause** — mulai dan jeda simulasi
- **⟳ Acak Map** — bangkitkan peta baru secara prosedural
- **◉ Acak Posisi** — acak ulang posisi Start (S) dan Tujuan (T)
- **Zoom** / **Pan** — navigasi peta via tombol, scroll mouse, atau drag
- **Keyboard** — Arrow Keys (pan), +/- (zoom), Spasi (start)

---

## 📌 Batasan Sistem

1. Algoritma yang diimplementasikan adalah **BFS dan DFS** pada graf tidak berbobot (hop-based), bukan bobot jarak geometris.
2. Data berupa **simulasi graf prosedural**, bukan peta kota nyata.
3. Sistem berbasis web sederhana **tanpa integrasi API peta** eksternal.
4. **Tidak mempertimbangkan** faktor kemacetan, arah jalan satu arah, atau kondisi lalu lintas.
5. Peta dibangkitkan ulang secara acak setiap kali tombol "Acak Map" ditekan; tidak ada penyimpanan peta.

---

## 📅 Informasi Projek

| Item | Detail |
|---|---|
| Mata Kuliah | Grafika Komputer INF11114 |
| Institusi | Universitas Maritim Raja Ali Haji (UMRAH) |
| Prodi | Teknik Informatika |
| Semester | Genap 2025/2026 |
| Lokasi Pengerjaan | Tanjungpinang |

---

## 📚 Referensi

- Cormen, T. H., Leiserson, C. E., Rivest, R. L., & Stein, C. (2009). *Introduction to Algorithms* (3rd ed.). MIT Press.
- Moore, E. F. (1959). *The shortest path through a maze*. Proceedings of an International Symposium on the Theory of Switching.
- MDN Web Docs — [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- GeeksforGeeks — [BFS for a Graph](https://www.geeksforgeeks.org/breadth-first-search-or-bfs-for-a-graph/)
- GeeksforGeeks — [DFS for a Graph](https://www.geeksforgeeks.org/depth-first-search-or-dfs-for-a-graph/)

---

<div align="center">
  <sub>&copy; UMRAH 2026 · Grafika Komputer INF11114</sub>
</div>
