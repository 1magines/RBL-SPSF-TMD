import numpy as np
import os

def load_el_centro_data(filepath="gempa_baru_mentawai_7_8_mW.txt", dt_provided=0.02, target_dt=0.01, total_duration_sec=None):
    try:
        raw_data = np.loadtxt(filepath) * 9.81 # konversi ke m/s^2
    except IOError:
        print(f"File gempa '{filepath}' tidak ditemukan. Menggunakan sinusoidal fallback.")
        return generate_sinusoidal_excitation(target_dt, total_duration_sec or 30, 1.0, 1.0)

    num_pts_raw = len(raw_data)
    time_raw = np.arange(0, num_pts_raw * dt_provided, dt_provided)
    
    final_duration = total_duration_sec if total_duration_sec and total_duration_sec <= time_raw[-1] else time_raw[-1]
    
    time_interp = np.arange(0, final_duration, target_dt)
    accel_interp = np.interp(time_interp, time_raw, raw_data)
    
    return time_interp, accel_interp

def generate_sinusoidal_excitation(dt, total_duration_sec, amplitude_m_s2, frequency_hz=1.0):
    if total_duration_sec <= 0 or dt <= 0: return np.array([]), np.array([])
    num_steps = int(round(total_duration_sec / dt))
    t = np.linspace(0, total_duration_sec, num_steps, endpoint=False)
    accel = amplitude_m_s2 * np.sin(2 * np.pi * frequency_hz * t)
    return t, accel