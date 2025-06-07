# RBL-SPSF-TMD
2 Hari Ngoprek ginian

How to use :
1. Install library yang dibutuhkan seperti :
    a. Flask(pip install flask)
    b. Flask_cors (pip install flask-cors)
    c. Scipy(pip install scipy)
    d. numpy(pip install numpy)

2. Run app_flask.py.
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
