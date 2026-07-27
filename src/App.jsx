import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// HARDWARE DATABASE
const HARDWARE_DATABASE = {
  gpus: [
    { id: 'rtx-4070ti-super', name: 'NVIDIA RTX 4070 Ti Super', vram: '16 GB', power: 285, price: 78000 },
    { id: 'rtx-4080-super', name: 'NVIDIA RTX 4080 Super', vram: '16 GB', power: 320, price: 102000 },
    { id: 'rtx-4060ti', name: 'NVIDIA RTX 4060 Ti', vram: '8 GB', power: 160, price: 39000 }
  ],
  cpus: [
    { id: 'i5-14600kf', name: 'Intel Core i5-14600KF', cores: '14 Cores', power: 125, price: 26000 },
    { id: 'i7-14700k', name: 'Intel Core i7-14700K', cores: '20 Cores', power: 253, price: 38000 }
  ],
  psus: [
    { id: 'psu-850w', name: '850W 80+ Gold Modular', wattage: 850, price: 10000, efficiency: 0.90 },
    { id: 'psu-650w', name: '650W 80+ Bronze', wattage: 650, price: 5500, efficiency: 0.82 }
  ],
  coolers: [
    { id: 'cooler-aio-360', name: '360mm ARGB Liquid AIO', type: 'Liquid', coolingCap: '300W', price: 9500 },
    { id: 'cooler-aio-240', name: '240mm Liquid AIO', type: 'Liquid', coolingCap: '220W', price: 7000 },
    { id: 'cooler-air', name: 'Dual-Tower Air Cooler', type: 'Air', coolingCap: '150W', price: 2500 }
  ]
};

const WORKLOAD_PRESETS = [
  { id: 'ai', name: 'AI/LLM Model Training', loadFactor: 1.0, icon: '🧠' },
  { id: 'gaming', name: '4K Ray Tracing Gaming', loadFactor: 0.85, icon: '🎮' },
  { id: 'blender', name: '3D CAD & Blender Render', loadFactor: 0.70, icon: '🎨' }
];

const COGNIZANT_BUDGET_LIMIT = 150000;

export default function App() {
  const [selectedGpu, setSelectedGpu] = useState(HARDWARE_DATABASE.gpus[0]);
  const [selectedCpu, setSelectedCpu] = useState(HARDWARE_DATABASE.cpus[0]);
  const [selectedPsu, setSelectedPsu] = useState(HARDWARE_DATABASE.psus[0]);
  const [selectedCooler, setSelectedCooler] = useState(HARDWARE_DATABASE.coolers[0]);
  const [selectedWorkload, setSelectedWorkload] = useState(WORKLOAD_PRESETS[0]);

  const [testing, setTesting] = useState(false);
  const [isOverheated, setIsOverheated] = useState(false);
  const [powerOverload, setPowerOverload] = useState(false);
  const [explodeFactor, setExplodeFactor] = useState(0);

  const mountRef = useRef(null);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);

  // 3D Animated Parts References
  const glassMeshRef = useRef(null);
  const fanGroupRef = useRef([]);
  const gpuMeshRef = useRef(null);
  const cpuCoolerRef = useRef(null);

  // Calculations
  const baseComponentsCost = 25000;
  const totalCost = selectedGpu.price + selectedCpu.price + selectedPsu.price + selectedCooler.price + baseComponentsCost;
  const totalSystemPower = Math.round((selectedGpu.power + selectedCpu.power + 80) * selectedWorkload.loadFactor);
  const budgetPercentage = Math.min(100, Math.round((totalCost / COGNIZANT_BUDGET_LIMIT) * 100));

  const dailyKWh = (totalSystemPower / 1000) * 8;
  const monthlyCostInr = Math.round(dailyKWh * 30 * 8);
  const annualCarbonKg = Math.round(dailyKWh * 365 * 0.82);

  // ------------------------------------------------------------------
  // 1. DETAILED THREE.JS 3D CABINET MODEL
  // ------------------------------------------------------------------
  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b0f17, 0.05);

    const camera = new THREE.PerspectiveCamera(45, currentMount.clientWidth / currentMount.clientHeight, 0.1, 100);
    camera.position.set(3.5, 2.0, 3.8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Ambient & Accent Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const greenSpot = new THREE.PointLight(0x76b900, 5, 8);
    greenSpot.position.set(1.5, 2.5, 2.0);
    scene.add(greenSpot);

    const internalLight = new THREE.PointLight(0x00ffff, 2, 4);
    internalLight.position.set(0, 0.2, 0);
    scene.add(internalLight);

    // Root PC Group
    const pcGroup = new THREE.Group();
    pcGroup.position.y = -0.2;
    scene.add(pcGroup);

    const metallicMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const darkFrameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });

    // Outer Frame Borders (Top, Bottom, Back, Front Pillar)
    const topCap = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 2.2), metallicMat);
    topCap.position.y = 1.0;
    pcGroup.add(topCap);

    const psuShroud = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.4, 2.18), darkFrameMat);
    psuShroud.position.y = -0.8;
    pcGroup.add(psuShroud);

    const backPlate = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.8, 0.08), darkFrameMat);
    backPlate.position.set(0, 0.1, -1.05);
    pcGroup.add(backPlate);

    const motherboardTray = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.5, 1.8), metallicMat);
    motherboardTray.position.set(-0.52, 0.1, 0);
    pcGroup.add(motherboardTray);

    // Motherboard PCB
    const moboMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.5 });
    const mobo = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.3, 1.4), moboMat);
    mobo.position.set(-0.48, 0.1, 0);
    pcGroup.add(mobo);

    // RAM Sticks (Glowing)
    const ramMat = new THREE.MeshStandardMaterial({ color: 0x76b900, emissive: 0x76b900, emissiveIntensity: 1.5 });
    for (let r = -0.1; r <= 0.1; r += 0.08) {
      const ram = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.25, 0.03), ramMat);
      ram.position.set(-0.42, 0.4, r + 0.1);
      pcGroup.add(ram);
    }

    // Detailed GPU Block
    const gpuGroup = new THREE.Group();
    gpuGroup.position.set(-0.1, -0.2, 0.1);
    
    const gpuBody = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 1.1), new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9 }));
    gpuGroup.add(gpuBody);

    const gpuLogo = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.04, 0.3), new THREE.MeshStandardMaterial({ color: 0x76b900, emissive: 0x76b900, emissiveIntensity: 2.0 }));
    gpuLogo.position.set(0, 0.08, 0);
    gpuGroup.add(gpuLogo);

    pcGroup.add(gpuGroup);
    gpuMeshRef.current = gpuGroup;

    // Liquid CPU Cooler Block
    const coolerGroup = new THREE.Group();
    coolerGroup.position.set(-0.4, 0.35, -0.1);
    
    const coolerBlock = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 32), new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x00ffff, emissiveIntensity: 1.5 }));
    coolerBlock.rotation.z = Math.PI / 2;
    coolerGroup.add(coolerBlock);

    pcGroup.add(coolerGroup);
    cpuCoolerRef.current = coolerGroup;

    // Glass Side Panel
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0.05, transmission: 0.95 });
    const glassMesh = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.9, 2.1), glassMat);
    glassMesh.position.set(0.6, 0.05, 0);
    pcGroup.add(glassMesh);
    glassMeshRef.current = glassMesh;

    // Front RGB Fans
    const rgbEmissiveMat = new THREE.MeshStandardMaterial({ color: 0x76b900, emissive: 0x76b900, emissiveIntensity: 2.5 });
    fanGroupRef.current = [];
    for (let i = -1; i <= 1; i++) {
      const fanGroup = new THREE.Group();
      fanGroup.position.set(0, i * 0.55 + 0.1, 1.08);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 16, 32), rgbEmissiveMat);
      fanGroup.add(ring);
      pcGroup.add(fanGroup);
      fanGroupRef.current.push(fanGroup);
    }

    // Animation Loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (window.is3dOverheated) {
        const flash = Math.sin(Date.now() * 0.012) > 0 ? 0xff0000 : 0x330000;
        rgbEmissiveMat.color.setHex(flash);
        rgbEmissiveMat.emissive.setHex(flash);
        fanGroupRef.current.forEach(f => f.rotation.z -= 0.5);
      } else {
        rgbEmissiveMat.color.setHex(0x76b900);
        rgbEmissiveMat.emissive.setHex(0x76b900);
        fanGroupRef.current.forEach(f => f.rotation.z -= 0.12);
      }

      pcGroup.rotation.y += 0.002;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!currentMount) return;
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update 3D Explosion Positions
  useEffect(() => {
    if (glassMeshRef.current) glassMeshRef.current.position.x = 0.6 + explodeFactor * 1.4;
    if (gpuMeshRef.current) gpuMeshRef.current.position.x = -0.1 + explodeFactor * 0.8;
    if (cpuCoolerRef.current) cpuCoolerRef.current.position.x = -0.4 + explodeFactor * 0.5;
    fanGroupRef.current.forEach((fan, idx) => {
      fan.position.z = 1.08 + explodeFactor * (0.6 + idx * 0.2);
    });
  }, [explodeFactor]);

  const zoomToComponent = (target) => {
    if (!cameraRef.current || !controlsRef.current) return;
    if (target === 'gpu') {
      cameraRef.current.position.set(1.5, 0.1, 1.2);
      controlsRef.current.target.set(-0.1, -0.2, 0.1);
    } else if (target === 'cooler') {
      cameraRef.current.position.set(1.2, 0.8, 0.8);
      controlsRef.current.target.set(-0.4, 0.35, -0.1);
    } else {
      cameraRef.current.position.set(3.5, 2.0, 3.8);
      controlsRef.current.target.set(0, 0, 0);
    }
  };

  // ------------------------------------------------------------------
  // 2. CHART.JS TELEMETRY SETUP
  // ------------------------------------------------------------------
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { label: 'CPU Temp (°C)', data: [], borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.3 },
          { label: 'Power Draw (W)', data: [], borderColor: '#76b900', backgroundColor: 'rgba(118, 185, 0, 0.1)', fill: true, tension: 0.3 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
          y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } }
        },
        plugins: { legend: { labels: { color: '#f8fafc', font: { size: 11 } } } }
      }
    });

    return () => chartRef.current?.destroy();
  }, []);

  // ------------------------------------------------------------------
  // 3. STRESS TEST SIMULATION
  // ------------------------------------------------------------------
  const runStressTest = () => {
    setTesting(true);
    setIsOverheated(false);
    setPowerOverload(false);
    window.is3dOverheated = false;

    let step = 0;
    const chart = chartRef.current;
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.data.datasets[1].data = [];

    const timer = setInterval(() => {
      step++;
      const tempRise = selectedCooler.type === 'Air' ? 9.2 : 5.1;
      const calculatedTemp = Math.round(35 + (step * tempRise * selectedWorkload.loadFactor));
      const calculatedPower = Math.min(totalSystemPower, Math.round(80 + step * (totalSystemPower / 5)));

      chart.data.labels.push(`${step * 2}s`);
      chart.data.datasets[0].data.push(calculatedTemp);
      chart.data.datasets[1].data.push(calculatedPower);
      chart.update();

      if (step >= 6) {
        clearInterval(timer);
        setTesting(false);

        const tempFailure = calculatedTemp >= 88;
        const psuFailure = totalSystemPower > selectedPsu.wattage;

        setIsOverheated(tempFailure);
        setPowerOverload(psuFailure);
        window.is3dOverheated = tempFailure || psuFailure;
      }
    }, 450);
  };

  const exportComplianceReport = () => {
    const reportData = {
      benchmarkTitle: "Cognizant AI PC Digital Twin Audit",
      timestamp: new Date().toISOString(),
      workloadPreset: selectedWorkload.name,
      specifications: { gpu: selectedGpu.name, cpu: selectedCpu.name, psu: selectedPsu.name, cooler: selectedCooler.name },
      metrics: { totalCostINR: totalCost, budgetCeilingINR: COGNIZANT_BUDGET_LIMIT, budgetCompliant: totalCost <= COGNIZANT_BUDGET_LIMIT, totalPowerWatts: totalSystemPower, estimatedMonthlyBillINR: monthlyCostInr, annualCarbonFootprintKg: annualCarbonKg }
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Cognizant_DigitalTwin_Report_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // ------------------------------------------------------------------
  // 4. UI RENDER
  // ------------------------------------------------------------------
  return (
    <div style={{ backgroundColor: '#0b0f17', minHeight: '100vh', color: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* HEADER */}
      <header style={{
        background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(118, 185, 0, 0.3)', padding: '12px 20px',
        position: 'sticky', top: 0, zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '14px', height: '14px', borderRadius: '2px', backgroundColor: '#76b900', boxShadow: '0 0 10px #76b900' }}></div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#ffffff' }}>
              DIGITAL TWIN <span style={{ color: '#76b900' }}>STUDIO</span>
            </h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
              Cognizant Benchmark Engine • <span style={{ color: '#76b900', fontWeight: 'bold' }}>Crafted by Elgin EB</span>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={exportComplianceReport} style={{ background: 'transparent', border: '1px solid #76b900', color: '#76b900', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
            📥 Export Audit Report
          </button>
          <div style={{
            background: totalCost > COGNIZANT_BUDGET_LIMIT ? 'rgba(239, 68, 68, 0.15)' : 'rgba(118, 185, 0, 0.15)',
            border: `1px solid ${totalCost > COGNIZANT_BUDGET_LIMIT ? '#ef4444' : '#76b900'}`,
            padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold',
            color: totalCost > COGNIZANT_BUDGET_LIMIT ? '#ef4444' : '#76b900'
          }}>
            ₹{totalCost.toLocaleString('en-IN')} / ₹1,50,000
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* 3D VIEWPORT WITH TRANSPARENT GLASS & DETAILED HARDWARE */}
        <div style={{
          position: 'relative', width: '100%', height: '44vh', minHeight: '300px', borderRadius: '12px', overflow: 'hidden',
          background: 'radial-gradient(circle at center, #1a2436 0%, #0b0f17 100%)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}>
          <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

          {/* Overheat Banner */}
          {(isOverheated || powerOverload) && (
            <div style={{
              position: 'absolute', top: '16px', right: '16px', left: '16px',
              background: 'rgba(220, 38, 38, 0.95)', color: '#ffffff', padding: '10px 16px', borderRadius: '8px',
              fontSize: '13px', fontWeight: 'bold', zIndex: 10, display: 'flex', justifyContent: 'space-between'
            }}>
              <span>⚠️ SYSTEM FAILURE DETECTED</span>
              <span>{isOverheated ? 'CPU OVERHEAT (>88°C)' : 'PSU OVERLOAD'}</span>
            </div>
          )}

          {/* Camera Zoom Hotspots */}
          <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px', zIndex: 10 }}>
            <button onClick={() => zoomToComponent('full')} style={btnStyle}>🔍 Full Case View</button>
            <button onClick={() => zoomToComponent('gpu')} style={btnStyle}>⚡ Focus GPU</button>
            <button onClick={() => zoomToComponent('cooler')} style={btnStyle}>❄️ Focus CPU Cooler</button>
          </div>

          {/* Exploded View Slider */}
          <div style={{
            position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(11, 15, 23, 0.85)', backdropFilter: 'blur(6px)',
            padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', zIndex: 10, display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <span style={{ fontSize: '11px', color: '#76b900', fontWeight: 'bold' }}>3D Component Explosion</span>
            <input type="range" min="0" max="1" step="0.05" value={explodeFactor} onChange={(e) => setExplodeFactor(parseFloat(e.target.value))} style={{ accentColor: '#76b900', cursor: 'pointer' }} />
          </div>
        </div>

        {/* WORKLOAD PRESETS & OPEX */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>WORKLOAD SCENARIO</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {WORKLOAD_PRESETS.map(w => (
                <button key={w.id} onClick={() => setSelectedWorkload(w)} style={{
                  padding: '8px', borderRadius: '6px', border: `1px solid ${selectedWorkload.id === w.id ? '#76b900' : 'rgba(255,255,255,0.05)'}`,
                  background: selectedWorkload.id === w.id ? 'rgba(118,185,0,0.15)' : '#0b0f17', color: '#fff', cursor: 'pointer', fontSize: '10px', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '16px' }}>{w.icon}</div>
                  <div style={{ fontWeight: 'bold', marginTop: '2px' }}>{w.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={cardHeaderStyle}>DYNAMIC OPEX & CARBON FOOTPRINT</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={statBoxStyle}>
                <div style={{ color: '#64748b' }}>Monthly Bill (India)</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#76b900' }}>₹{monthlyCostInr.toLocaleString('en-IN')}/mo</div>
              </div>
              <div style={statBoxStyle}>
                <div style={{ color: '#64748b' }}>Annual CO₂ Impact</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f59e0b' }}>{annualCarbonKg} kg CO₂</div>
              </div>
            </div>
          </div>
        </div>

        {/* HARDWARE CUSTOMIZER & TELEMETRY */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>

          <div style={cardStyle}>
            <div style={cardHeaderStyle}>HARDWARE SELECTOR</div>
            
            <div>
              <label style={labelStyle}>Graphics Card (GPU)</label>
              {HARDWARE_DATABASE.gpus.map(g => (
                <div key={g.id} onClick={() => setSelectedGpu(g)} style={{ ...itemStyle, background: selectedGpu.id === g.id ? 'rgba(118, 185, 0, 0.15)' : '#0b0f17', border: `1px solid ${selectedGpu.id === g.id ? '#76b900' : 'rgba(255, 255, 255, 0.05)'}` }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#fff' }}>{g.name}</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{g.vram} | TDP: {g.power}W</div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#76b900' }}>₹{g.price.toLocaleString('en-IN')}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '10px' }}>
              <label style={labelStyle}>Cooling Unit</label>
              {HARDWARE_DATABASE.coolers.map(c => (
                <div key={c.id} onClick={() => setSelectedCooler(c)} style={{ ...itemStyle, background: selectedCooler.id === c.id ? 'rgba(118, 185, 0, 0.15)' : '#0b0f17', border: `1px solid ${selectedCooler.id === c.id ? '#76b900' : 'rgba(255, 255, 255, 0.05)'}` }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#fff' }}>{c.name}</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>Capacity: {c.coolingCap}</div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#76b900' }}>₹{c.price.toLocaleString('en-IN')}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...cardStyle, justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={cardHeaderStyle}>TELEMETRY MONITOR</div>
                <button onClick={runStressTest} disabled={testing} style={{
                  background: testing ? '#334155' : '#76b900', color: '#0b0f17', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'
                }}>
                  {testing ? 'TESTING...' : 'RUN STRESS TEST'}
                </button>
              </div>
              <div style={{ height: '180px', background: '#0b0f17', borderRadius: '8px', padding: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <canvas ref={canvasRef}></canvas>
              </div>
            </div>

            <div style={{ background: '#0b0f17', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                <span>Budget Limit Utilization</span>
                <span style={{ color: budgetPercentage > 100 ? '#ef4444' : '#76b900', fontWeight: 'bold' }}>{budgetPercentage}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, budgetPercentage)}%`, height: '100%', background: budgetPercentage > 100 ? '#ef4444' : '#76b900', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <footer style={{ textAlign: 'center', padding: '16px 0 8px 0', fontSize: '12px', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '20px' }}>
          Crafted  by <span style={{ color: '#76b900', fontWeight: 'bold' }}>Elgin EB</span>
        </footer>

      </main>
    </div>
  );
}

// Helpers
const cardStyle = { background: '#131b2a', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: '10px' };
const cardHeaderStyle = { margin: 0, fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.8px', color: '#76b900' };
const btnStyle = { background: 'rgba(11, 15, 23, 0.85)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' };
const statBoxStyle = { background: '#0b0f17', padding: '10px', borderRadius: '6px', fontSize: '11px' };
const labelStyle = { fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' };
const itemStyle = { padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' };