# python_core/building_model.py
import numpy as np
from scipy.linalg import eig

class Building:
    """
    Kelas untuk merepresentasikan model struktural bangunan.
    Dapat merakit matriks global M, C, K dan menghitung properti dinamis fundamental.
    """
    def __init__(self, num_stories, masses_kg, stiffnesses_N_m, dampings_Ns_m):
        """
        Inisialisasi model bangunan.

        Args:
            num_stories (int): Jumlah lantai.
            masses_kg (list): List massa per lantai (kg).
            stiffnesses_N_m (list): List kekakuan per lantai (N/m).
            dampings_Ns_m (list): List redaman per lantai (Ns/m).
        """
        self.n_stories = int(num_stories)
        if self.n_stories <= 0:
            self.masses, self.stiffnesses, self.dampings = [], [], []
            self._M, self._K, self._C = np.array([]), np.array([]), np.array([])
            self.omega_s, self.xi_s = 0, 0
            return

        self.masses = np.array(masses_kg[:self.n_stories])
        self.stiffnesses = np.array(stiffnesses_N_m[:self.n_stories])
        self.dampings = np.array(dampings_Ns_m[:self.n_stories])
        
        # Rakit matriks global saat inisialisasi
        self._M = self._assemble_mass_matrix()
        self._K = self._assemble_stiffness_matrix()
        self._C = self._assemble_damping_matrix()

        # Hitung properti fundamental
        self._calculate_fundamental_properties()

    def get_mass_matrix(self):
        return self._M

    def get_stiffness_matrix(self):
        return self._K

    def get_damping_matrix(self):
        return self._C

    def _assemble_mass_matrix(self):
        if self.n_stories == 0: return np.array([]).reshape(0,0)
        return np.diag(self.masses)

    def _assemble_stiffness_matrix(self):
        if self.n_stories == 0: return np.array([]).reshape(0,0)
        K = np.zeros((self.n_stories, self.n_stories))
        k_plus = np.concatenate((self.stiffnesses, [0]))
        for i in range(self.n_stories):
            K[i,i] = k_plus[i] + k_plus[i+1]
            if i > 0:
                K[i, i-1] = -k_plus[i]
            if i < self.n_stories - 1:
                K[i, i+1] = -k_plus[i+1]
        return K

    def _assemble_damping_matrix(self):
        if self.n_stories == 0: return np.array([]).reshape(0,0)
        C = np.zeros((self.n_stories, self.n_stories))
        c_plus = np.concatenate((self.dampings, [0]))
        for i in range(self.n_stories):
            C[i,i] = c_plus[i] + c_plus[i+1]
            if i > 0:
                C[i, i-1] = -c_plus[i]
            if i < self.n_stories - 1:
                C[i, i+1] = -c_plus[i+1]
        return C

    def _calculate_fundamental_properties(self):
        """
        Menghitung frekuensi natural fundamental (omega_s) dan rasio redaman modal (xi_s)
        menggunakan analisis eigenvalue.
        """
        if self.n_stories == 0 or np.linalg.det(self._M) == 0:
            self.omega_s, self.xi_s = 0, 0
            return
            
        try:
            # Eigenvalue problem: K*phi = omega^2 * M * phi
            eigenvalues, eigenvectors = eig(self._K, self._M)
            
            # Urutkan eigenvalues untuk menemukan mode fundamental
            sorted_indices = np.argsort(np.real(eigenvalues))
            fundamental_idx = sorted_indices[0]
            
            # Frekuensi fundamental (omega_s)
            omega_squared = np.real(eigenvalues[fundamental_idx])
            self.omega_s = np.sqrt(omega_squared) if omega_squared > 1e-6 else 0
            
            # Estimasi rasio redaman untuk mode fundamental (xi_s)
            # xi = (phi.T * C * phi) / (2 * omega * phi.T * M * phi)
            phi_1 = np.real(eigenvectors[:, fundamental_idx]).reshape(self.n_stories, 1)
            
            # Normalisasi modal mass menjadi 1
            modal_mass = phi_1.T @ self._M @ phi_1
            phi_1 = phi_1 / np.sqrt(modal_mass)
            
            modal_damping = phi_1.T @ self._C @ phi_1
            denominator = 2 * self.omega_s
            
            self.xi_s = (modal_damping / denominator).item() if denominator > 1e-6 else 0.02
            
            if self.xi_s < 0: # Pastikan redaman tidak negatif
                self.xi_s = 0.02

        except Exception as e:
            print(f"Error saat menghitung properti fundamental: {e}. Menggunakan fallback.")
            # Fallback jika kalkulasi gagal
            self.omega_s = np.sqrt(self.stiffnesses[0] / self.masses[0]) # Aproksimasi SDOF
            self.xi_s = 0.02 # Asumsi umum

    def get_total_mass(self):
        return np.sum(self.masses)
