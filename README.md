# RBL-SPSF-TMD

How to use :  
0. Download semua code, ya itu ujung kanan atas tombol ijo pencet yg ada tulisan "code" pilih zip terus ekstrak.
1. Install library yang dibutuhkan seperti :  
    a. Flask(pip install flask)  
    b. Flask_cors (pip install flask-cors)  
    c. Scipy(pip install scipy)  
    d. numpy(pip install numpy)  

2. Run app_flask.py.(jangan diclose visual studio codenya)
3. Buka index.html menggunakan browser.

# CATATAN
1. REDUKSI DI FREKUENSI RENDAH ( dibawah 1.0 Hz) Cenderung memilki nilai reduksi yang sangat rendah(0-2%)
2. REDUKSI DI FREKUENSI TINGGI (Diatas 3 Hz) Cenderung memiliki reduksi RMS tinggi(70%) dan reduksi amplitudo rendah(12-20%)
3. REDUKSI PALING OPTIMAL BERADA DI Nilai Frekuensi Hz 1.4
4. INI DILAKUKAN UNTUK BANGUNAN 3 TINGKAT, JIKA ANDA INGIN MENGUBAH PARAMETERNYA DAPAT DILAKUKAN HAL BERIKUT :  
        a. UBAH DEF_BLDG_PROPS di app.flask.py  
        b. NUM Stories --> jumlah gedung  
        c. Masses_kg --> Tiap massa per gedungnya, paling kiri paling bawah, paling kanan paling atas  
        d. Stiffness dan Dampings --> Tiap per gedung juga, paling kiri paling bawah, paling kanan paling atas  
5. INGAT INI SISTEM SINGLE TUNED MASS DAMPING UNTUK EXCITATION EARTHQUAKE.
6. DISINI KITA OPTIMASI NILAI REDUKSI AMPLITUDO DAN REDUKSI RMSNYA.
7. YANG DIOPTIMASI ADALAH NILAI MASSA, KEKAKUAN(K), DAN REDAMAN(C) TMD.


Proyek simulasi Tuned Mass Damper (TMD) ini berhasil menggabungkan beberapa konsep fundamental dalam pemodelan dan simulasi fisis, melebihi syarat minimal tiga poin yang ditetapkan. Berikut adalah analisis pemenuhan setiap poin:

✅ 1. Representasi dan Analisis Data Menggunakan Grafik
Terpenuhi. Aplikasi ini secara ekstensif menggunakan grafik untuk memvisualisasikan data hasil simulasi, yang merupakan inti dari antarmuka penggunanya.

Implementasi: Pada sisi front-end, file app.js memanfaatkan pustaka Chart.js untuk membuat plot perbandingan respons struktur.
Bukti Kode:
Di index.html, elemen <canvas id="comparison_plot_canvas" ...> disiapkan sebagai wadah untuk grafik.
Di app.js, fungsi updateAllVisuals secara eksplisit membuat objek grafik baru: comparisonChart = new Chart(elements.compPlotCvs, { type: 'line', ... }). Fungsi ini memplot data perpindahan lantai teratas dari simulasi "Tanpa TMD" dan "Dengan TMD" sebagai deret waktu (time series).  
✅ 2. Review Metode Numerik dalam Fisika
Terpenuhi. Inti dari simulasi ini adalah penggunaan metode numerik untuk menyelesaikan persamaan gerak sistem.

Implementasi: Kode pada back-end menggunakan metode Newmark-Beta, sebuah metode integrasi numerik yang sangat umum dan andal dalam bidang dinamika struktural untuk menyelesaikan persamaan diferensial orde dua (Mu¨+Cu˙+Ku=F(t)).
Bukti Kode:
File simulation_engine.py berisi fungsi newmark_beta_solver(M, C, K, F_ext_time_history, dt, u0, v0, ...) yang merupakan implementasi lengkap dari algoritma ini untuk menghitung perpindahan, kecepatan, dan percepatan sistem pada setiap langkah waktu (dt).  
✅ 3. Sistem Partikel Sederhana dan Metode Simulasi Berbasis Partikel
Terpenuhi. Seluruh model fisis dari gedung dan peredam massanya direpresentasikan sebagai sistem partikel (massa terkumpul) yang saling berinteraksi.

Implementasi: Gedung dimodelkan sebagai tumpukan massa diskrit (setiap lantai adalah satu "partikel") yang terhubung oleh pegas dan peredam. TMD juga merupakan partikel tambahan yang terhubung ke salah satu lantai.
Bukti Kode:
building_model.py: Kelas Building merepresentasikan gedung dengan merakit matriks massa (_M), kekakuan (_K), dan redaman (_C) dari properti setiap lantai. Matriks massa yang dirakit (np.diag(self.masses)) jelas menunjukkan model massa terkumpul.
tmd_model.py: Kelas TMD mendefinisikan peredam massa sebagai sistem partikel tunggal dengan massa, kekakuan, dan redaman sendiri.
coupled_system.py: Fungsi get_coupled_matrices menggabungkan matriks-matriks dari gedung dan TMD menjadi satu sistem partikel yang lebih besar.  
✅ 5. Pengolahan Sinyal Digital (Time Series Data)
Terpenuhi. Proyek ini melibatkan pembuatan dan analisis data deret waktu (time series), yang merupakan salah satu aspek fundamental dari pengolahan sinyal digital.

Implementasi: Sinyal eksitasi (gaya eksternal) dibangkitkan sebagai data deret waktu. Selain itu, data output (perpindahan) juga dianalisis untuk mengekstrak metrik performa.
Bukti Kode:
excitation_handler.py: Fungsi generate_sinusoidal_excitation membuat sinyal sinusoidal sebagai deret waktu dengan interval dt.
app.js: Fungsi displayPerformanceMetrics melakukan analisis pada sinyal output. Fungsi ini menghitung nilai RMS (Root Mean Square) dari data perpindahan, yang merupakan teknik standar dalam pengolahan sinyal untuk mengukur energi atau daya efektif dari sebuah sinyal.  
Aspek yang Tidak Terpenuhi  
4. Sistem Bilangan Random: Tidak ada penggunaan bilangan acak yang signifikan. Sinyal eksitasi yang digunakan bersifat deterministik (sinusoidal) atau berasal dari file data gempa yang sudah ada (load_el_centro_data).  
6. Metode Simulasi Berbasis Grid: Simulasi ini menggunakan model massa terkumpul (berbasis partikel), bukan metode berbasis grid (seperti Finite Element Method atau Finite Difference Method) yang mendiskritisasi ruang menjadi sebuah grid.  
7. Intelegensia Buatan (Jaringan Syaraf Tiruan): Proses optimasi TMD di optimal_tmd_calculator.py didasarkan pada formula analitis dan heuristik dari penelitian dinamika struktur, bukan menggunakan model AI atau Jaringan Saraf Tiruan.  
