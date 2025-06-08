# --- tmd_model.py ---
class TMD:
    def __init__(self, mass_kg, stiffness_N_m, damping_Ns_m, attachment_floor_idx):
        self.m_d = float(mass_kg)
        self.k_d = float(stiffness_N_m)
        self.c_d = float(damping_Ns_m)
        self.attach_floor = int(attachment_floor_idx)