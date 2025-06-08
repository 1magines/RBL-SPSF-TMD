# python_core/app_flask.py
from flask import Flask, request, jsonify, send_from_directory, make_response
from flask_cors import CORS
import numpy as np
import os
import traceback

# Import modul-modul yang diperlukan
from building_model import Building
from tmd_model import TMD
from coupled_system import get_coupled_matrices
from simulation_engine import newmark_beta_solver
from excitation_handler import generate_sinusoidal_excitation
# Import kalkulator TMD optimal yang baru
from optimal_tmd_calculator import calculate_optimal_tmd_params

# Inisialisasi aplikasi Flask
app = Flask(__name__, static_folder='../web_interface', static_url_path='')
CORS(app) 

# --- Konfigurasi Default ---
DEF_BLDG_PROPS = {
    'num_stories': 3,
    'masses_kg': [60000, 50000, 40000],
    'stiffnesses_N_m': [2e7, 1.8e7, 1.5e7],
    'dampings_Ns_m': [1e4, 9e3, 8e3]
}
SIM_DT = 0.01
CUR_DIR = os.path.dirname(os.path.abspath(__file__))

# --- Fungsi Helper Internal ---
def _run_single_simulation(building_props, tmd_params, use_tmd, excitation_signal, sim_dt):
    """Menjalankan satu simulasi dinamika struktur (tidak berubah dari kode asli)."""
    num_stories = building_props.get('num_stories', DEF_BLDG_PROPS['num_stories'])
    masses = DEF_BLDG_PROPS['masses_kg'][:num_stories]
    stiffnesses = DEF_BLDG_PROPS['stiffnesses_N_m'][:num_stories]
    dampings = DEF_BLDG_PROPS['dampings_Ns_m'][:num_stories]
    
    bldg = Building(num_stories, masses, stiffnesses, dampings)
    M_sys, C_sys, K_sys = None, None, None
    n_dof_total = 0
    
    if use_tmd and tmd_params:
        attachment_idx = max(0, min(num_stories - 1, tmd_params.get('attachment_floor_idx', num_stories - 1)))
        if num_stories == 0: return {'time':[], 'displacements_building':[], 'num_stories_actual':0, 'error':'Gedung 0 lantai.'}
        tmd_instance = TMD(float(tmd_params['mass_kg']), float(tmd_params['stiffness_N_m']), float(tmd_params['damping_Ns_m']), attachment_idx)
        M_sys, C_sys, K_sys = get_coupled_matrices(bldg, tmd_instance)
        n_dof_total = M_sys.shape[0]
    else:
        if num_stories == 0: return {'time':[], 'displacements_building':[], 'num_stories_actual':0, 'error':'Gedung 0 lantai.'}
        M_sys, C_sys, K_sys = bldg.get_mass_matrix(), bldg.get_damping_matrix(), bldg.get_stiffness_matrix()
        n_dof_total = num_stories

    if n_dof_total == 0 or M_sys is None or M_sys.size == 0: return {'time':[], 'displacements_building':[], 'num_stories_actual':num_stories, 'error':'DOF total 0.'}
    
    u0, v0 = np.zeros((n_dof_total,1)), np.zeros((n_dof_total,1))
    # Pengaruh eksitasi tanah pada setiap DOF gedung
    F_ext_influence = -np.array(bldg.masses)
    F_ext_history = np.zeros((len(excitation_signal), n_dof_total))
    
    if num_stories > 0:
        for i in range(len(excitation_signal)):
            force_on_bldg = F_ext_influence * excitation_signal[i]
            F_ext_history[i, :num_stories] = force_on_bldg[:min(num_stories, len(force_on_bldg))]
            
    time_vec, u_hist, _, _ = newmark_beta_solver(M_sys, C_sys, K_sys, F_ext_history, sim_dt, u0, v0)
    
    sim_output = {
        'time': time_vec.tolist() if time_vec.size > 0 else [], 
        'displacements_building': u_hist[:, :num_stories].tolist() if u_hist.size > 0 and u_hist.shape[1] >= num_stories else [], 
        'num_stories_actual': num_stories
    }
    
    if use_tmd and tmd_params and u_hist.size > 0 and u_hist.shape[1] > num_stories:
        # Displacement TMD adalah DOF terakhir, relatif terhadap lantai pemasangan
        disp_lantai_pasang = u_hist[:, tmd_instance.attach_floor]
        disp_tmd_absolut = u_hist[:, num_stories]
        sim_output['displacement_tmd_relative'] = (disp_tmd_absolut - disp_lantai_pasang).tolist()
        
    return sim_output

# --- Endpoints API ---
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

# --- [BARU] Endpoint untuk mendapatkan properti gedung ---
@app.route('/api/building_properties', methods=['GET'])
def get_building_properties():
    """
    Menyediakan data properti gedung dasar, seperti total massa, ke frontend.
    """
    try:
        # Menjumlahkan semua massa lantai untuk mendapatkan massa total gedung
        total_mass = sum(DEF_BLDG_PROPS['masses_kg'])
        return jsonify({'total_mass_kg': total_mass})
    except Exception as e:
        # Mengembalikan error jika terjadi masalah
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

@app.route('/run_manual_simulation_comparison', methods=['POST'])
def run_manual_sim_comp_route():
    """Endpoint untuk simulasi manual (tidak berubah)."""
    response = {'no_tmd_results':None, 'with_tmd_manual_results':None, 'error':None}
    try:
        data = request.get_json()
        if not data: 
            response['error'] = 'Request kosong.'
            return jsonify(response), 400
        
        sim_duration = float(data.get('sim_duration', 20.0))
        exc_amplitude = float(data.get('excitation_amplitude', 1.0))
        exc_frequency = float(data.get('excitation_frequency', 1.0))
        
        building_config = {'num_stories': int(data.get('num_stories', DEF_BLDG_PROPS['num_stories']))}
        tmd_manual_params = data.get('tmd_params')
        use_tmd_flag = data.get('use_tmd_from_checkbox', False)

        _, current_excitation = generate_sinusoidal_excitation(SIM_DT, sim_duration, exc_amplitude, exc_frequency)
        if current_excitation.size == 0:
            response['error'] = 'Gagal membuat sinyal eksitasi.'
            return jsonify(response), 500
        
        response['no_tmd_results'] = _run_single_simulation(building_config, None, False, current_excitation, SIM_DT)
        response['with_tmd_manual_results'] = _run_single_simulation(building_config, tmd_manual_params if use_tmd_flag else None, use_tmd_flag, current_excitation, SIM_DT)
        
        return jsonify(response)
    except Exception as e:
        response['error'] = str(e)
        response['trace'] = traceback.format_exc()
        return jsonify(response), 500

@app.route('/optimize_auto_and_run_comparison', methods=['POST'])
def optimize_auto_and_run_comparison_route():
    """Endpoint untuk optimasi otomatis yang telah dirombak total."""
    resp = {'no_tmd_results':None, 'with_tmd_optimized_results':None, 'optimized_tmd_params':None, 'error':None}
    try:
        data = request.get_json()
        if not data:
            resp['error'] = 'Request kosong.'
            return jsonify(resp), 400
        
        sim_duration = float(data.get('sim_duration', 20.0))
        exc_amplitude = float(data.get('excitation_amplitude', 1.0))
        exc_frequency = float(data.get('excitation_frequency', 1.5))
        num_stories = int(data.get('num_stories', DEF_BLDG_PROPS['num_stories']))
        
        masses = DEF_BLDG_PROPS['masses_kg'][:num_stories]
        stiffnesses = DEF_BLDG_PROPS['stiffnesses_N_m'][:num_stories]
        dampings = DEF_BLDG_PROPS['dampings_Ns_m'][:num_stories]
        building = Building(num_stories, masses, stiffnesses, dampings)
        
        mass_ratio_mu = 0.10 
        
        print(f"Flask: Menghitung TMD optimal untuk Freq={exc_frequency}Hz dengan mu={mass_ratio_mu*100}%...")
        optimized_tmd_params = calculate_optimal_tmd_params(building, exc_frequency, mass_ratio_mu)
        
        if not optimized_tmd_params:
            resp['error'] = 'Kalkulasi TMD optimal gagal.'
            return jsonify(resp), 500
        
        resp['optimized_tmd_params'] = optimized_tmd_params
        
        building_config = {'num_stories': num_stories}
        _, current_excitation = generate_sinusoidal_excitation(SIM_DT, sim_duration, exc_amplitude, exc_frequency)
        if current_excitation.size == 0:
            resp['error'] = 'Gagal membuat eksitasi pasca-optimasi.'
            return jsonify(resp), 500
        
        resp['no_tmd_results'] = _run_single_simulation(building_config, None, False, current_excitation, SIM_DT)
        resp['with_tmd_optimized_results'] = _run_single_simulation(building_config, optimized_tmd_params, True, current_excitation, SIM_DT)
        
        return jsonify(resp)
        
    except Exception as e:
        resp['error'] = str(e)
        resp['trace'] = traceback.format_exc()
        return jsonify(resp), 500

if __name__ == '__main__':
    print(f"Static folder: {app.static_folder}")
    print("Menjalankan server Flask...")
    app.run(host='0.0.0.0', port=5000, debug=True)
