// web_interface/app.js - Enhanced Version dengan Reduksi Amplitudo & Animasi yang Lebih Mudah Diamati
document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Referensi Elemen DOM yang Aman & Jelas ---
    const getEl = id => document.getElementById(id);
    
    // Semua variabel elemen UI dikumpulkan di sini untuk konsistensi
    const elements = {
        tmdMassNum: getEl('tmd_mass_number'),
        tmdStiffNum: getEl('tmd_stiffness_number'),
        tmdDampNum: getEl('tmd_damping_number'),
        simDurSl: getEl('sim_duration'), simDurVal: getEl('sim_duration_value'),
        excAmpSl: getEl('excitation_amplitude'), excAmpVal: getEl('excitation_amplitude_value'),
        excFreqSl: getEl('excitation_frequency'), excFreqVal: getEl('excitation_frequency_value'),
        tmdMassSl: getEl('tmd_mass'), tmdMassVal: getEl('tmd_mass_value'),
        tmdStiffSl: getEl('tmd_stiffness'), tmdStiffVal: getEl('tmd_stiffness_value'),
        tmdDampSl: getEl('tmd_damping'), tmdDampVal: getEl('tmd_damping_value'),
        useTmdManualCb: getEl('use_tmd_manual_checkbox'),
        runManualBtn: getEl('run_manual_button'),
        runAutoOptBtn: getEl('run_auto_opt_button'),
        statMsg: getEl('status_message'),
        animNoTMDcvs: getEl('anim_canvas_no_tmd'),
        animWthTMDcvs: getEl('anim_canvas_with_tmd'),
        actTmdMass: getEl('active_tmd_mass'),
        actTmdStiff: getEl('active_tmd_stiffness'),
        actTmdDamp: getEl('active_tmd_damping'),
        compPlotCvs: getEl('comparison_plot_canvas'),
        // Elemen baru untuk kontrol animasi dan info reduksi
        animSpeedSl: getEl('animation_speed_slider'),
        animSpeedVal: getEl('animation_speed_value'),
        amplitudeReduction: getEl('amplitude_reduction_info'),
        performanceMetrics: getEl('performance_metrics')
    };

    const animCtxNoTMD = elements.animNoTMDcvs ? elements.animNoTMDcvs.getContext('2d') : null;
    const animCtxWithTMD = elements.animWthTMDcvs ? elements.animWthTMDcvs.getContext('2d') : null;
    
    let comparisonChart = null;
    let animFrameIdNoTMD = null;
    let animFrameIdWithTMD = null;
    let animationSpeed = 1.0; // Kecepatan animasi (1.0 = normal, 0.5 = setengah kecepatan, dst)
    const DEFAULT_NUM_STORIES = 3;

    // --- 2. Fungsi Utilitas ---
    function updateSliderValues() {
        if (elements.simDurSl && elements.simDurVal) elements.simDurVal.textContent = elements.simDurSl.value;
        if (elements.excAmpSl && elements.excAmpVal) elements.excAmpVal.textContent = parseFloat(elements.excAmpSl.value).toFixed(1);
        if (elements.excFreqSl && elements.excFreqVal) elements.excFreqVal.textContent = parseFloat(elements.excFreqSl.value).toFixed(1);
        if (elements.tmdMassSl && elements.tmdMassVal) elements.tmdMassVal.textContent = parseFloat(elements.tmdMassSl.value).toFixed(0);
        if (elements.tmdStiffSl && elements.tmdStiffVal) elements.tmdStiffVal.textContent = parseFloat(elements.tmdStiffSl.value).toFixed(0);
        if (elements.tmdDampSl && elements.tmdDampVal) elements.tmdDampVal.textContent = parseFloat(elements.tmdDampSl.value).toFixed(0);
        if (elements.animSpeedSl && elements.animSpeedVal) {
            animationSpeed = parseFloat(elements.animSpeedSl.value);
            elements.animSpeedVal.textContent = `${animationSpeed.toFixed(1)}x`;
        }
    }

    // Event listeners untuk slider
    [elements.simDurSl, elements.excAmpSl, elements.excFreqSl, elements.tmdMassSl, elements.tmdStiffSl, elements.tmdDampSl, elements.animSpeedSl].forEach(slider => {
        if (slider) {
            slider.addEventListener('input', updateSliderValues);
        }
    });

    // Inisialisasi nilai slider
    updateSliderValues();
    
    function getUIParams() {
        return {
            sim_duration: parseFloat(elements.simDurSl.value),
            excitation_amplitude: parseFloat(elements.excAmpSl.value),
            excitation_frequency: parseFloat(elements.excFreqSl.value),
            tmd_params: {
                mass_kg: parseFloat(elements.tmdMassSl.value),
                stiffness_N_m: parseFloat(elements.tmdStiffSl.value),
                damping_Ns_m: parseFloat(elements.tmdDampSl.value)
            },
            num_stories: DEFAULT_NUM_STORIES,
            use_tmd_from_checkbox: elements.useTmdManualCb ? elements.useTmdManualCb.checked : false
        };
    }

    function displayActiveTMDParams(params, type = "Manual") {
        if (!elements.actTmdMass) return;
        const prefix = type ? `${type} ` : "";
        if (params) {
            elements.actTmdMass.textContent = `${prefix}Massa: ${parseFloat(params.mass_kg).toFixed(1)} kg`;
            elements.actTmdStiff.textContent = `${prefix}Kekakuan: ${parseFloat(params.stiffness_N_m).toExponential(2)} N/m`;
            elements.actTmdDamp.textContent = `${prefix}Redaman: ${parseFloat(params.damping_Ns_m).toExponential(2)} Ns/m`;
        } else {
            elements.actTmdMass.textContent = "Massa: - (Tanpa TMD)";
            elements.actTmdStiff.textContent = "Kekakuan: -";
            elements.actTmdDamp.textContent = "Redaman: -";
        }
    }

    // Fungsi baru untuk menampilkan reduksi amplitudo dan metrik performa
    function displayPerformanceMetrics(noTmdData, withTmdData) {
        if (!elements.amplitudeReduction || !elements.performanceMetrics) return;
        
        if (noTmdData && withTmdData && noTmdData.displacements_building && withTmdData.displacements_building) {
            const numStories = noTmdData.num_stories_actual || DEFAULT_NUM_STORIES;
            
            // Hitung amplitudo maksimum lantai teratas
            const noTmdTopFloor = noTmdData.displacements_building.map(ts => Math.abs(ts[numStories - 1] || 0));
            const withTmdTopFloor = withTmdData.displacements_building.map(ts => Math.abs(ts[numStories - 1] || 0));
            
            const maxNoTmd = Math.max(...noTmdTopFloor);
            const maxWithTmd = Math.max(...withTmdTopFloor);
            
            // Hitung reduksi amplitudo
            const reduction = ((maxNoTmd - maxWithTmd) / maxNoTmd) * 100;
            const reductionText = reduction > 0 ? `${reduction.toFixed(1)}%` : 'Tidak efektif';
            
            // Hitung RMS (Root Mean Square) untuk analisis yang lebih akurat
            const rmsNoTmd = Math.sqrt(noTmdTopFloor.reduce((sum, val) => sum + val * val, 0) / noTmdTopFloor.length);
            const rmsWithTmd = Math.sqrt(withTmdTopFloor.reduce((sum, val) => sum + val * val, 0) / withTmdTopFloor.length);
            const rmsReduction = ((rmsNoTmd - rmsWithTmd) / rmsNoTmd) * 100;
            
            // Update tampilan
            elements.amplitudeReduction.innerHTML = `
                <div style="background: linear-gradient(135deg, #e3f2fd, #bbdefb); padding: 15px; border-radius: 8px; margin: 10px 0;">
                    <h4 style="margin: 0 0 10px 0; color: #1565c0;">📊 Efektivitas TMD</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <strong>Reduksi Amplitudo Puncak:</strong><br>
                            <span style="font-size: 1.2em; color: ${reduction > 0 ? '#2e7d32' : '#d32f2f'}; font-weight: bold;">
                                ${reductionText}
                            </span>
                        </div>
                        <div>
                            <strong>Reduksi RMS:</strong><br>
                            <span style="font-size: 1.2em; color: ${rmsReduction > 0 ? '#2e7d32' : '#d32f2f'}; font-weight: bold;">
                                ${rmsReduction > 0 ? `${rmsReduction.toFixed(1)}%` : 'Tidak efektif'}
                            </span>
                        </div>
                    </div>
                </div>
            `;
            
            elements.performanceMetrics.innerHTML = `
                <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; font-size: 0.9em;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <strong>Tanpa TMD:</strong><br>
                            Max: ${maxNoTmd.toFixed(4)} m<br>
                            RMS: ${rmsNoTmd.toFixed(4)} m
                        </div>
                        <div>
                            <strong>Dengan TMD:</strong><br>
                            Max: ${maxWithTmd.toFixed(4)} m<br>
                            RMS: ${rmsWithTmd.toFixed(4)} m
                        </div>
                    </div>
                </div>
            `;
        } else {
            elements.amplitudeReduction.innerHTML = '<div style="padding: 10px; text-align: center; color: #666;">Jalankan simulasi untuk melihat efektivitas TMD</div>';
            elements.performanceMetrics.innerHTML = '';
        }
    }
    
    async function handleBackendRequest(endpoint, payload, method = 'POST') {
        if (elements.statMsg) elements.statMsg.textContent = 'Menjalankan simulasi...';
        try {
            const response = await fetch(`http://127.0.0.1:5000${endpoint}`, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const results = await response.json();
            if (!response.ok || results.error) {
                console.error("Error dari Backend:", results);
                throw new Error(results.error || `HTTP error ${response.status}`);
            }
            console.log(`Data diterima dari ${endpoint}:`, results);
            return results;
        } catch (e) {
            console.error(`Error saat berkomunikasi dengan ${endpoint}:`, e);
            if (elements.statMsg) elements.statMsg.textContent = `Error: ${e.message}`;
            updateAllVisuals(null, null); // Kosongkan visualisasi jika ada error
            throw e;
        }
    }

    // --- 3. Logika Tombol Utama ---
    if (elements.runManualBtn) {
        elements.runManualBtn.addEventListener('click', async () => {
            const uiParams = getUIParams();
            try {
                if(elements.statMsg) elements.statMsg.textContent = 'Menjalankan simulasi manual & perbandingan...';
                const results = await handleBackendRequest('/run_manual_simulation_comparison', uiParams);
                if(elements.statMsg) elements.statMsg.textContent = 'Simulasi manual selesai.';
                updateAllVisuals(results.no_tmd_results, results.with_tmd_manual_results);
                displayActiveTMDParams(uiParams.use_tmd_from_checkbox ? uiParams.tmd_params : null, "Manual");
                displayPerformanceMetrics(results.no_tmd_results, results.with_tmd_manual_results);
            } catch (e) { /* Error sudah ditangani */ }
        });
    }

    if (elements.runAutoOptBtn) {
        elements.runAutoOptBtn.addEventListener('click', async () => {
            const uiParams = getUIParams();
            const payload = {
                sim_duration: uiParams.sim_duration,
                excitation_amplitude: uiParams.excitation_amplitude,
                excitation_frequency: uiParams.excitation_frequency,
                num_stories: uiParams.num_stories
            };
            try {
                if(elements.statMsg) elements.statMsg.textContent = 'Optimasi Otomatis & Simulasi...';
                const results = await handleBackendRequest('/optimize_auto_and_run_comparison', payload);
                if (results.optimized_tmd_params) {
                    const optParams = results.optimized_tmd_params;
                    if (elements.tmdMassSl && elements.tmdMassNum) {
                        elements.tmdMassSl.value = optParams.mass_kg;
                        elements.tmdMassNum.value = optParams.mass_kg;
                    }
                    if (elements.tmdStiffSl && elements.tmdStiffNum) {
                        const stiffVal = parseFloat(optParams.stiffness_N_m);
                        elements.tmdStiffSl.min = 9000;
                        elements.tmdStiffSl.max = 1200000;
                        elements.tmdStiffSl.step = 10000;
                        elements.tmdStiffSl.value = stiffVal;
                        elements.tmdStiffNum.value = stiffVal;
                    }





                    if (elements.tmdDampSl && elements.tmdDampNum) {
                        elements.tmdDampSl.value = optParams.damping_Ns_m;
                        elements.tmdDampNum.value = optParams.damping_Ns_m;
                    }
                    updateSliderValues();
                    displayActiveTMDParams(optParams, "Optimal");
                    if(elements.useTmdManualCb) elements.useTmdManualCb.checked = true;
                } else {
                    displayActiveTMDParams(null);
                }
                updateAllVisuals(results.no_tmd_results, results.with_tmd_optimized_results);
                displayPerformanceMetrics(results.no_tmd_results, results.with_tmd_optimized_results);
                if(elements.statMsg) elements.statMsg.textContent = 'Optimasi & visualisasi selesai.';
            } catch (e) { /* Error sudah ditangani */ }
        });
    }

    // --- 4. Fungsi Visualisasi Utama ---
    function updateAllVisuals(noTmdData, withTmdData) {
        const numStories = (noTmdData?.num_stories_actual) || (withTmdData?.num_stories_actual) || DEFAULT_NUM_STORIES;
        console.log("Updating visuals. NoTMD:", noTmdData, "WithTMD:", withTmdData);

        // Hentikan animasi yang sedang berjalan
        if (animFrameIdNoTMD) {
            cancelAnimationFrame(animFrameIdNoTMD);
            animFrameIdNoTMD = null;
        }
        if (animFrameIdWithTMD) {
            cancelAnimationFrame(animFrameIdWithTMD);
            animFrameIdWithTMD = null;
        }

        // Bersihkan canvas
        if(animCtxNoTMD) animCtxNoTMD.clearRect(0, 0, elements.animNoTMDcvs.width, elements.animNoTMDcvs.height);
        if(animCtxWithTMD) animCtxWithTMD.clearRect(0, 0, elements.animWthTMDcvs.width, elements.animWthTMDcvs.height);
        
        // Hapus chart lama
        if (comparisonChart) {
            comparisonChart.destroy();
            comparisonChart = null;
        }

        const datasets = [];
        const isValidData = (data) => data && data.time && data.time.length > 0 &&
                                    data.displacements_building && data.displacements_building.length > 0 &&
                                    data.displacements_building[0] && data.displacements_building[0].length >= numStories && numStories > 0;

        if (isValidData(noTmdData)) {
            const topFloorData = noTmdData.displacements_building.map(ts => ts[numStories - 1]);
            datasets.push({ 
                label: `Tanpa TMD (Maks: ${Math.max(...topFloorData.map(d => Math.abs(d))).toFixed(4)}m)`, 
                data: topFloorData.map((y, i) => ({ x: noTmdData.time[i], y: y })), 
                borderColor: 'dodgerblue', 
                tension: 0.1, 
                fill: false, 
                pointRadius: 0, 
                borderWidth: 2 
            });
            if (animCtxNoTMD) {
                animFrameIdNoTMD = runAnim(animCtxNoTMD, elements.animNoTMDcvs, noTmdData.time, noTmdData.displacements_building, null, numStories);
            }
        } else { 
            console.warn("Data 'Tanpa TMD' tidak valid untuk visualisasi."); 
        }

        if (isValidData(withTmdData)) {
            const topFloorData = withTmdData.displacements_building.map(ts => ts[numStories - 1]);
            datasets.push({ 
                label: `Dengan TMD (Maks: ${Math.max(...topFloorData.map(d => Math.abs(d))).toFixed(4)}m)`, 
                data: topFloorData.map((y, i) => ({ x: withTmdData.time[i], y: y })), 
                borderColor: 'crimson', 
                tension: 0.1, 
                fill: false, 
                pointRadius: 0, 
                borderWidth: 2 
            });
            if (animCtxWithTMD) {
                animFrameIdWithTMD = runAnim(animCtxWithTMD, elements.animWthTMDcvs, withTmdData.time, withTmdData.displacements_building, withTmdData.displacement_tmd_relative, numStories);
            }
        } else { 
            console.warn("Data 'Dengan TMD' tidak valid atau tidak tersedia."); 
            displayActiveTMDParams(null); 
        }
        
        if (elements.compPlotCvs && datasets.length > 0) {
            comparisonChart = new Chart(elements.compPlotCvs, { 
                type: 'line', 
                data: { datasets: datasets }, 
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    scales: { 
                        x: {type:'linear', title:{display:true, text:'Waktu (s)'}}, 
                        y: {title:{display:true, text:'Perpindahan Lt. Atas (m)'}}
                    }, 
                    animation: {duration:0}, 
                    plugins: {legend:{labels:{boxWidth:12,padding:10}}} 
                } 
            });
        }
    }
    
    function runAnim(ctx, cvs, time, bDisp, tmdDispRel, nSt) {
        if (!ctx || !cvs || !time || time.length < 2) return null;
        
        let curF = 0;
        let lastTime = performance.now();
        const fh = cvs.height / (nSt + 2.5);
        const bw = cvs.width * 0.5;
        const bX = (cvs.width - bw) / 2;
        
        // Validasi data dan hitung skala
        const cleanBDisps = bDisp.flat().filter(d => Number.isFinite(d));
        const allDisps = cleanBDisps.map(d => Math.abs(d));
        if (tmdDispRel && tmdDispRel.length > 0) {
            const cleanTmdDisps = tmdDispRel.filter(d => Number.isFinite(d));
            allDisps.push(...cleanTmdDisps.map(d => Math.abs(d)));
        }
        
        const maxOD = Math.max(...allDisps, 0.001);
        let sf = (cvs.width * 0.20) / maxOD;
        if (!isFinite(sf) || sf < 1) sf = 1; 
        if (sf > 5000) sf = 5000;

        // Perhitungan kecepatan animasi yang lebih cerdas
        const simDuration = time[time.length - 1] - time[0];
        const excitationFreq = parseFloat(elements.excFreqSl?.value || 1);
        
        // Kalkulasi kecepatan berdasarkan frekuensi eksitasi
        // Untuk frekuensi tinggi, perlambat animasi agar mudah diamati
        let adaptiveSpeed = animationSpeed;
        if (excitationFreq > 2) {
            adaptiveSpeed = animationSpeed * (2 / excitationFreq); // Perlambat untuk frekuensi tinggi
        }
        
        // Pastikan minimal dapat melihat beberapa siklus
        const targetAnimDuration = Math.max(5, Math.min(15, simDuration)); // 5-15 detik animasi
        const speedMultiplier = simDuration / targetAnimDuration * adaptiveSpeed;

        function drawFrame(currentTime) {
            // Kontrol waktu berdasarkan kecepatan animasi
            const deltaTime = currentTime - lastTime;
            const timeStep = time.length > 1 ? time[1] - time[0] : 0.01;
            
            // Hitung increment frame berdasarkan kecepatan yang disesuaikan
            const targetFPS = 30;
            const frameIncrement = Math.max(0.1, (deltaTime / 1000) * speedMultiplier / timeStep);
            
            if (deltaTime >= 1000 / targetFPS) { // Batasi ke target FPS
                if (curF >= time.length) curF = 0;
                if (!bDisp[Math.floor(curF)]) { curF = 0; }
                if (time.length === 0 || !bDisp[Math.floor(curF)] || Math.floor(curF) >= bDisp.length) return;
                
                const frameIndex = Math.floor(curF);
                
                ctx.clearRect(0, 0, cvs.width, cvs.height);
                
                // Background dengan gradien yang lebih menarik
                const gradient = ctx.createLinearGradient(0, 0, 0, cvs.height);
                gradient.addColorStop(0, '#e3f2fd');
                gradient.addColorStop(1, '#f9f9f9');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, cvs.width, cvs.height);
                
                // Ground dengan bayangan
                ctx.fillStyle = 'dimgray'; 
                ctx.fillRect(0, cvs.height - fh, cvs.width, fh);
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.fillRect(0, cvs.height - fh - 2, cvs.width, 2);
                
                // Tampilkan informasi waktu dan frekuensi
                ctx.fillStyle = '#333';
                ctx.font = '12px Arial';
                ctx.fillText(`Waktu: ${time[frameIndex].toFixed(2)}s`, 10, 20);
                ctx.fillText(`Kecepatan: ${adaptiveSpeed.toFixed(1)}x`, 10, 35);
                
                // Draw building floors dengan efek yang lebih halus
                for (let i = 0; i < nSt; i++) {
                    if (i >= bDisp[frameIndex].length || !Number.isFinite(bDisp[frameIndex][i])) continue;
                    
                    const flAbsX = bX + bDisp[frameIndex][i] * sf;
                    const curFY = cvs.height - fh * (i + 2);
                    
                    // Floor dengan gradien dan bayangan
                    const floorGradient = ctx.createLinearGradient(flAbsX, curFY, flAbsX + bw, curFY + fh * 0.8);
                    floorGradient.addColorStop(0, '#87ceeb');
                    floorGradient.addColorStop(1, '#4682b4');
                    ctx.fillStyle = floorGradient;
                    ctx.fillRect(flAbsX, curFY, bw, fh * 0.8);
                    
                    // Bayangan lantai
                    ctx.fillStyle = 'rgba(0,0,0,0.1)';
                    ctx.fillRect(flAbsX + 2, curFY + 2, bw, fh * 0.8);
                    
                    // Border lantai
                    ctx.strokeStyle = '#333'; 
                    ctx.lineWidth = 2; 
                    ctx.strokeRect(flAbsX, curFY, bw, fh * 0.8);
                    
                    // Label lantai
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(`Lt.${i + 1}`, flAbsX + bw / 2, curFY + fh * 0.5);
                    ctx.textAlign = 'left';
                    
                    // Column to previous floor dengan efek 3D
                    const prevAbsX = (i > 0 && (i-1) < bDisp[frameIndex].length && Number.isFinite(bDisp[frameIndex][i-1])) ? 
                                     bX + bDisp[frameIndex][i-1]*sf : bX;
                    const prevY = (i > 0) ? cvs.height-fh*(i+1) : cvs.height-fh;
                    
                    ctx.strokeStyle = '#555';
                    ctx.lineWidth = 8;
                    ctx.beginPath(); 
                    ctx.moveTo(prevAbsX + bw / 2, prevY); 
                    ctx.lineTo(flAbsX + bw / 2, curFY + fh * 0.8); 
                    ctx.stroke();
                    
                    // Highlight kolom dengan warna yang berbeda
                    ctx.strokeStyle = '#777';
                    ctx.lineWidth = 4;
                    ctx.beginPath(); 
                    ctx.moveTo(prevAbsX + bw / 2 - 2, prevY); 
                    ctx.lineTo(flAbsX + bw / 2 - 2, curFY + fh * 0.8); 
                    ctx.stroke();
                    
                    // TMD on top floor dengan animasi yang lebih detail
                    if (i === nSt - 1 && tmdDispRel && tmdDispRel.length > frameIndex && Number.isFinite(tmdDispRel[frameIndex])) {
                        const tmdAbsX = flAbsX + tmdDispRel[frameIndex] * sf;
                        const tmdY = curFY - fh * 0.6; 
                        const tmdW = bw * 0.4;
                        const tmdH = fh * 0.5;
                        
                        // TMD mass dengan gradien dan efek 3D
                        const tmdGradient = ctx.createRadialGradient(
                            tmdAbsX - tmdW / 2 + bw / 2 + tmdW / 2, tmdY + tmdH / 2, 0,
                            tmdAbsX - tmdW / 2 + bw / 2 + tmdW / 2, tmdY + tmdH / 2, tmdW / 2
                        );
                        tmdGradient.addColorStop(0, '#ff6b6b');
                        tmdGradient.addColorStop(1, '#cc0000');
                        
                        ctx.fillStyle = tmdGradient;
                        ctx.fillRect(tmdAbsX - tmdW / 2 + bw / 2, tmdY, tmdW, tmdH);
                        
                        // TMD shadow
                        ctx.fillStyle = 'rgba(0,0,0,0.2)';
                        ctx.fillRect(tmdAbsX - tmdW / 2 + bw / 2 + 2, tmdY + 2, tmdW, tmdH);
                        
                        // TMD border
                        ctx.strokeStyle = 'darkred'; 
                        ctx.lineWidth = 2;
                        ctx.strokeRect(tmdAbsX - tmdW / 2 + bw / 2, tmdY, tmdW, tmdH);
                        
                        // TMD label
                        ctx.fillStyle = '#fff';
                        ctx.font = 'bold 12px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText('TMD', tmdAbsX - tmdW / 2 + bw / 2 + tmdW / 2, tmdY + tmdH / 2 + 4);
                        ctx.textAlign = 'left';
                        
                        // TMD connection dengan spring visualization
                        const connectionPoints = 8;
                        const springHeight = (tmdY + tmdH / 2) - curFY;
                        const springWidth = 15;
                        const tmdCenterX = tmdAbsX - tmdW / 2 + bw / 2 + tmdW / 2;
                        
                        ctx.strokeStyle = '#333'; 
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(flAbsX + bw / 2, curFY);
                        
                        // Gambar spring dengan zigzag
                        for (let j = 0; j < connectionPoints; j++) {
                            const yPos = curFY + (springHeight * j / connectionPoints);
                            const xOffset = (j % 2 === 0) ? -springWidth/2 : springWidth/2;
                            ctx.lineTo(flAbsX + bw / 2 + xOffset, yPos);
                        }
                        ctx.lineTo(tmdCenterX, tmdY + tmdH / 2);
                        ctx.stroke();
                        
                        // Damper visualization (rectangle beside spring)
                        const damperX = flAbsX + bw / 2 + 20;
                        const damperY = curFY + springHeight * 0.3;
                        const damperHeight = springHeight * 0.4;
                        
                        ctx.strokeStyle = '#666';
                        ctx.lineWidth = 4;
                        ctx.strokeRect(damperX - 5, damperY, 10, damperHeight);
                        ctx.beginPath();
                        ctx.moveTo(damperX, damperY);
                        ctx.lineTo(tmdCenterX, tmdY + tmdH / 2);
                        ctx.stroke();
                    }
                }
                
                // Update frame counter dengan smooth interpolation
                curF += frameIncrement;
                if (curF >= time.length) curF = 0;
                
                lastTime = currentTime;
            }
            
            // Schedule next frame
            if (ctx === animCtxNoTMD) {
                animFrameIdNoTMD = requestAnimationFrame(drawFrame);
            } else if (ctx === animCtxWithTMD) {
                animFrameIdWithTMD = requestAnimationFrame(drawFrame);
            }
        }
        
        return requestAnimationFrame(drawFrame);
    }
    
    // --- Inisialisasi Halaman ---
    if (elements.runManualBtn) {
        console.log("Memicu simulasi manual awal untuk inisialisasi.");
        elements.runManualBtn.click();
    } else {
        console.error("Tombol 'run_manual_button' tidak ditemukan di HTML! Tidak bisa menjalankan simulasi awal.");
    }

function bindSliderAndInput(slider, number, valueDisplay, toFixed = 0) {
    const update = val => {
        slider.value = val;
        number.value = val;
        if (valueDisplay && valueDisplay.textContent !== undefined) {
            valueDisplay.textContent = parseFloat(val).toFixed(toFixed);
        }
    };

    slider.addEventListener('input', () => update(slider.value));
    number.addEventListener('input', () => update(number.value));
}


    fetch('http://127.0.0.1:5000/api/building_properties')
        .then(res => res.json())
        .then(data => {
            const totalMass = data.total_mass_kg;
            const minMass = Math.round(0.01 * totalMass);
            const maxMass = Math.round(0.10 * totalMass);
            const defaultMass = Math.round(0.05 * totalMass);

            [elements.tmdMassSl, elements.tmdMassNum].forEach(el => {
                el.min = minMass;
                el.max = maxMass;
                el.value = defaultMass;
            });
            if (elements.tmdMassVal) elements.tmdMassVal.textContent = defaultMass;
        });

    bindSliderAndInput(elements.tmdMassSl, elements.tmdMassNum, elements.tmdMassVal, 0);
    bindSliderAndInput(elements.tmdStiffSl, elements.tmdStiffNum, elements.tmdStiffVal, 0, true);
    bindSliderAndInput(elements.tmdDampSl, elements.tmdDampNum, elements.tmdDampVal, 0);



});