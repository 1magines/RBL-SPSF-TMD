# python_core/coupled_system.py
import numpy as np
from building_model import Building # Baris ini sudah ada
from tmd_model import TMD          # TAMBAHKAN BARIS INI

def get_coupled_matrices(building_obj: Building, tmd_obj: TMD):
    M_b = building_obj.get_mass_matrix()
    C_b = building_obj.get_damping_matrix()
    K_b = building_obj.get_stiffness_matrix()

    n_dof_building = building_obj.n_stories
    if n_dof_building == 0: 
        if tmd_obj: 
            return np.array([[tmd_obj.m_d]]), np.array([[tmd_obj.c_d]]), np.array([[tmd_obj.k_d]])
        else:
            return np.array([[]]).reshape(0,0), np.array([[]]).reshape(0,0), np.array([[]]).reshape(0,0)

    n_dof_total = n_dof_building + 1
    idx_attach = tmd_obj.attach_floor
    
    if not (0 <= idx_attach < n_dof_building):
        print(f"Peringatan CoupledSystem: attachment_floor_idx ({idx_attach}) tidak valid. Menggunakan lantai teratas.")
        idx_attach = max(0, n_dof_building - 1)

    M_sys = np.zeros((n_dof_total, n_dof_total))
    M_sys[:n_dof_building, :n_dof_building] = M_b
    M_sys[n_dof_building, n_dof_building] = tmd_obj.m_d

    C_sys = np.zeros((n_dof_total, n_dof_total))
    C_sys[:n_dof_building, :n_dof_building] = C_b
    C_sys[idx_attach, idx_attach] += tmd_obj.c_d
    C_sys[idx_attach, n_dof_building] = -tmd_obj.c_d
    C_sys[n_dof_building, idx_attach] = -tmd_obj.c_d
    C_sys[n_dof_building, n_dof_building] = tmd_obj.c_d

    K_sys = np.zeros((n_dof_total, n_dof_total))
    K_sys[:n_dof_building, :n_dof_building] = K_b
    K_sys[idx_attach, idx_attach] += tmd_obj.k_d
    K_sys[idx_attach, n_dof_building] = -tmd_obj.k_d
    K_sys[n_dof_building, idx_attach] = -tmd_obj.k_d
    K_sys[n_dof_building, n_dof_building] = tmd_obj.k_d
    
    return M_sys, C_sys, K_sys