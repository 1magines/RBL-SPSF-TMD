import numpy as np

def calculate_optimal_tmd_params(building, excitation_freq_hz, mass_ratio_mu):
    """
    Menghitung parameter TMD optimal menggunakan strategi klasifikasi frekuensi 
    berdasarkan laporan penelitian, dengan penyesuaian untuk frekuensi rendah.
    Parameter optimal (gamma_opt, xi_d_opt) ditentukan berdasarkan rasio 
    frekuensi ternormalisasi beta = omega_exc / omega_s.

    Perubahan utama: Untuk beta < 0.9, gamma_opt diatur ke beta (dengan batas bawah 0.1)
    untuk mencoba meningkatkan kinerja pada frekuensi rendah.
    """
    m_s = building.get_total_mass()
    omega_s = building.omega_s  # Diasumsikan sebagai frekuensi alami gedung dalam rad/s
    xi_s = building.xi_s      # Rasio redaman gedung
    mu = mass_ratio_mu        # Rasio massa TMD (m_tmd / m_s)
    
    if omega_s < 1e-6:
        print("Peringatan: Frekuensi fundamental gedung mendekati nol. Menggunakan parameter TMD fallback.")
        return {'mass_kg': mu * m_s, 'stiffness_N_m': 1e6, 'damping_Ns_m': 1e3}

    omega_exc = 2 * np.pi * excitation_freq_hz
    
    if abs(omega_s) < 1e-9:
        if abs(omega_exc) < 1e-9: 
            beta = 0.0 
        else: 
            beta = 1e9 
    else:
        beta = omega_exc / omega_s

    gamma_opt_calculated = 0.0  # Rasio frekuensi optimal TMD (omega_tmd / omega_s) sebelum clamping
    xi_d_opt = 0.0              # Rasio redaman TMD optimal

    regime_info = ""

    # Implementasi logika kondisional berdasarkan beta
    if beta < 0.5:
        regime_info = "Rezim Frekuensi Rendah (FRL) - Enhanced Aggressive"

        mu_eff = mu / (1 + mu)
        alpha = 0.9 + 0.4 * beta + 0.1 * mu
        
        # Over-tuning TMD untuk frekuensi lebih tinggi dari eksitasi (aggressive response)
        gamma_opt = max(0.1, beta * (1.8 + 0.9 * np.log1p(1 / beta)))
        
        # Tingkatkan base damping
        base_damping = np.sqrt(3 * mu / (4 * (1 + mu)**2))  # Lebih besar dari sebelumnya

        # Ekspansi coupling struktur
        low_freq_factor = 3.0 + 4.0 * (0.5 - beta)
        structure_coupling = 1.0 + 2.0 * np.exp(1.8 * xi_s)
        xi_d_opt = base_damping * low_freq_factor * structure_coupling

        if mu < 0.02:
            xi_d_opt *= 2.0
            gamma_opt *= 1.2

        xi_d_opt = max(0.08, min(xi_d_opt, 0.95))


    elif beta < 0.9:  # Mencakup Rezim Frekuensi Rendah-Menengah (FRM)
        regime_info = "Rezim Frekuensi Rendah-Menengah (FRM)"
        gamma_opt_calculated = beta # Menala ke frekuensi eksitasi
        xi_d_opt = 0.20 + 0.5 * xi_s # Redaman moderat, disesuaikan dengan redaman struktur
    elif 0.9 <= beta <= 1.1:  
        regime_info = "Rezim Frekuensi Resonan (FR)"
        # Menggunakan aproksimasi Den Hartog untuk frekuensi tala
        gamma_opt_calculated = 1.0 / (1.0 + mu) 
        # Formula heuristik dari laporan penelitian untuk xi_d_opt
        if mu < 0: mu = 0 
        base_sqrt_term = (3 * mu / (8 * (1 + mu)))
        if base_sqrt_term < 0: base_sqrt_term = 0 
        
        xi_d_opt_calc = (base_sqrt_term**0.5) * (1 + 2.5*xi_s - 1.5*mu + mu**2)
        xi_d_opt = max(0.01, min(xi_d_opt_calc, 0.7)) 
    elif 1.1 < beta <= 2.5:  
        regime_info = "Rezim Frekuensi Menengah-Tinggi (FMT)"
        gamma_opt_calculated = 1.0 / (1.0 + mu)
        if mu < 0: mu = 0
        base_sqrt_term = (3 * mu / (8 * (1 + mu)))
        if base_sqrt_term < 0: base_sqrt_term = 0

        xi_d_opt_calc = (base_sqrt_term**0.5) * (1 + 2.0*xi_s - 1.0*mu + mu**2)
        xi_d_opt = max(0.01, min(xi_d_opt_calc, 0.6)) 
    else:  # beta > 2.5 (Rezim Frekuensi Sangat Tinggi - FST)
        regime_info = "Rezim Frekuensi Sangat Tinggi (FST)"
        gamma_opt_calculated = 1.0 / (1.0 + mu) 
        xi_d_opt = 0.5 

    # Terapkan batas bawah untuk gamma_opt setelah perhitungan berdasarkan beta
    gamma_opt = max(0.1, gamma_opt_calculated)
    
    # Pastikan xi_d_opt juga memiliki batas bawah yang wajar (terutama jika formula menghasilkan nilai kecil)
    xi_d_opt = max(0.01, xi_d_opt) 

    print(f"Mode Kalkulasi (f_exc={excitation_freq_hz:.2f} Hz, beta={beta:.3f}): {regime_info}.")
    print(f"  gamma_opt_calculated (sebelum clamp): {gamma_opt_calculated:.4f}, xi_d_opt (sebelum clamp akhir): {xi_d_opt:.4f}")


    # Konversi kembali parameter dimensionless ke properti fisik TMD
    m_d = mu * m_s
    omega_d_opt = gamma_opt * omega_s
    k_d_opt = m_d * (omega_d_opt**2)
    c_d_opt = xi_d_opt * 2 * m_d * omega_d_opt
    
    # Fallback jika c_d_optimal menjadi negatif (seharusnya tidak terjadi dengan clamp xi_d_opt >= 0.01)
    if c_d_opt < 0:
        print("Peringatan: c_d_optimal dihitung negatif, menggunakan fallback.")
        xi_d_safe_min = 0.01 
        c_d_opt = 2 * xi_d_safe_min * m_d * omega_d_opt

    optimal_params = {
        'mass_kg': m_d,
        'stiffness_N_m': k_d_opt,
        'damping_Ns_m': c_d_opt
    }
    
    print(f"  Parameter dimensionless TMD final: gamma_opt={gamma_opt:.4f}, xi_d_opt={xi_d_opt:.4f}")
    print(f"  Hasil Akhir Parameter Fisik TMD: {optimal_params}")

    return optimal_params
