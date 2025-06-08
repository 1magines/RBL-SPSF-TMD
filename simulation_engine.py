# --- simulation_engine.py ---
import numpy as np

def newmark_beta_solver(M, C, K, F_ext_time_history, dt, u0, v0, gamma=0.5, beta=0.25):
    n_steps = F_ext_time_history.shape[0]
    n_dof = M.shape[0]

    if n_dof == 0: return np.array([]), np.zeros((n_steps, 0)), np.zeros((n_steps, 0)), np.zeros((n_steps, 0))
    if n_steps == 0: return np.array([]), np.zeros((0, n_dof)), np.zeros((0, n_dof)), np.zeros((0, n_dof))

    u0 = np.array(u0,dtype=float).reshape(n_dof,1); v0 = np.array(v0,dtype=float).reshape(n_dof,1)
    u,v,a = np.zeros((n_steps,n_dof)), np.zeros((n_steps,n_dof)), np.zeros((n_steps,n_dof))
    time_vector = np.linspace(0,(n_steps-1)*dt,n_steps) if n_steps > 0 else np.array([])

    if n_steps > 0:
        u[0,:]=u0.flatten(); v[0,:]=v0.flatten()
        try:
            F0 = F_ext_time_history[0,:].reshape(n_dof,1)
            M_inv = np.linalg.inv(M)
            a[0,:]=(M_inv@(F0-C@v0-K@u0)).flatten()
        except np.linalg.LinAlgError:
            M_pinv = np.linalg.pinv(M)
            a[0,:]=(M_pinv@(F0-C@v0-K@u0)).flatten()
        except Exception as e_a0: 
            print(f"Error menghitung a0: {e_a0}. a0 disetel ke nol."); a[0,:]=0.0
            
    a1=1/(beta*dt**2); a2=1/(beta*dt); a3=(1/(2*beta))-1
    a4=gamma/(beta*dt); a5=gamma/beta-1; a6=dt*((gamma/(2*beta))-1)
    
    K_hat = K + a1*M + a4*C
    try:
        K_hat_inv = np.linalg.inv(K_hat)
    except np.linalg.LinAlgError:
        print("Peringatan: Matriks K_hat singular, menggunakan pseudo-inverse.")
        K_hat_inv = np.linalg.pinv(K_hat)

    for i in range(n_steps-1):
        F_ip1 = F_ext_time_history[i+1,:].reshape(n_dof,1)
        u_i=u[i,:].reshape(n_dof,1); v_i=v[i,:].reshape(n_dof,1); a_i=a[i,:].reshape(n_dof,1)
        
        P_hat = F_ip1 + M@(a1*u_i + a2*v_i + a3*a_i) + C@(a4*u_i + a5*v_i + a6*a_i)
        
        u_ip1 = K_hat_inv @ P_hat
        a_ip1 = a1*(u_ip1-u_i) - a2*v_i - a3*a_i
        v_ip1 = v_i + dt*((1-gamma)*a_i + gamma*a_ip1)
        
        u[i+1,:]=u_ip1.flatten()
        v[i+1,:]=v_ip1.flatten()
        a[i+1,:]=a_ip1.flatten()
        
    return time_vector, u, v, a