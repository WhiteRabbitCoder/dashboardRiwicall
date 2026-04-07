export async function reportsView() {
    // Funciones para descargar archivos
    const downloadCSV = (data, filename) => {
        let csv = '';

        if (Array.isArray(data) && data.length > 0) {
            // Obtener headers del primer objeto
            const headers = Object.keys(data[0]);
            csv = headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',') + '\n';

            // Agregar filas
            csv += data.map(row =>
                headers.map(header => {
                    const value = row[header] ?? '';
                    return `"${String(value).replace(/"/g, '""')}"`;
                }).join(',')
            ).join('\n');
        }

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    };

    const downloadJSON = (data, filename) => {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    };

    return {
        title: 'Reportes y Descargas',

        // 1. ESTRUCTURA (HTML y CSS)
        template: `
    <style>
        .reportes-container { padding: 32px; background: #F8FAFC; min-height: 100vh; }
        .text-hint { color: #64748B; font-size: 14px; margin-bottom: 24px; }
        
        /* Grid de tarjetas */
        .grid-descargas { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 40px; }
        
        .card-descarga { background: white; padding: 24px; border-radius: 24px; border: 1px solid #E2E8F0; transition: all 0.3s ease; }
        .card-descarga:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-color: #C7D2FE; }
        
        .card-icon { width: 48px; height: 48px; background: #F5F3FF; color: #6366F1; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        
        .card-info h3 { font-size: 18px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
        .card-info p { font-size: 13px; color: #64748B; margin-bottom: 20px; }
        
        .btn-group { display: flex; gap: 12px; }
        .btn-dl { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: 0.2s; border: none; }
        .btn-csv { background: #6366F1; color: white; }
        .btn-json { background: #F1F5F9; color: #475569; }
        .btn-dl:active { transform: scale(0.95); }

        /* Sección de Resumen */
        .resumen-card { background: white; padding: 32px; border-radius: 24px; border: 1px solid #E2E8F0; }
        .grid-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        .stat-item { padding: 20px; text-align: center; border-radius: 16px; background: #F8FAFC; border: 1px solid #F1F5F9; }
        .stat-value { font-size: 24px; font-weight: 800; color: #1E293B; display: block; }
        .stat-label { font-size: 12px; color: #94A3B8; font-weight: 600; text-transform: uppercase; }
    </style>

    <div class="reportes-container animate-in">
        <h1 class="text-2xl font-black text-slate-800 mb-2">Centro de Reportes</h1>
        <p class="text-hint">Exporta los datos de RiwiCalls en formatos estándar para análisis externo.</p>

        <div class="grid-descargas">
            <div class="card-descarga">
                <div class="card-icon"><i data-lucide="users"></i></div>
                <div class="card-info">
                    <h3>Candidatos</h3>
                    <p>Base de datos completa de inscritos.</p>
                </div>
                <div class="btn-group">
                    <button class="btn-dl btn-csv" data-tipo="candidatos" data-formato="csv">CSV</button>
                    <button class="btn-dl btn-json" data-tipo="candidatos" data-formato="json">JSON</button>
                </div>
            </div>

            <div class="card-descarga">
                <div class="card-icon"><i data-lucide="phone-call"></i></div>
                <div class="card-info">
                    <h3>Llamadas</h3>
                    <p>Historial de interacciones de la IA.</p>
                </div>
                <div class="btn-group">
                    <button class="btn-dl btn-csv" data-tipo="llamadas" data-formato="csv">CSV</button>
                    <button class="btn-dl btn-json" data-tipo="llamadas" data-formato="json">JSON</button>
                </div>
            </div>

            <div class="card-descarga">
                <div class="card-icon"><i data-lucide="calendar"></i></div>
                <div class="card-info">
                    <h3>Eventos</h3>
                    <p>Log de actividades del sistema.</p>
                </div>
                <div class="btn-group">
                    <button class="btn-dl btn-csv" data-tipo="eventos" data-formato="csv">CSV</button>
                    <button class="btn-dl btn-json" data-tipo="eventos" data-formato="json">JSON</button>
                </div>
            </div>
        </div>

        <div class="resumen-card">
            <h4 class="text-slate-400 font-bold uppercase text-xs mb-6 tracking-widest">Resumen General</h4>
            <div class="grid-stats">
                <div class="stat-item">
                    <span class="stat-value" id="stat-registros">0</span>
                    <span class="stat-label">Registros</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value" id="stat-conversion">0%</span>
                    <span class="stat-label">Conversión</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value" id="stat-municipios">0</span>
                    <span class="stat-label">Municipios</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value" id="stat-horas">0h</span>
                    <span class="stat-label">Optimizadas</span>
                </div>
            </div>
        </div>
    </div>
    `,

        // 2. LÓGICA (Funcionalidad de botones)
        logic: async function() {
            // Cargar datos desde localStorage
            const candidatos = JSON.parse(localStorage.getItem('candidatos_riwicalls') || '[]');
            const llamadas = JSON.parse(localStorage.getItem('llamadas_riwicalls') || '[]');
            const eventos = JSON.parse(localStorage.getItem('eventos_riwicalls') || '[]');

            // Calcular estadísticas para el resumen
            const totalCandidatos = candidatos.length;
            const admitidos = candidatos.filter(c => (c.estado_gestion || c.estado || '').toLowerCase().includes('admitido')).length;
            const conversionRate = totalCandidatos > 0 ? Math.round((admitidos / totalCandidatos) * 100) : 0;
            const municipios = new Set(candidatos.map(c => c.municipio).filter(m => m));
            const totalMunicipios = municipios.size;

            let horasOptimizadas = 0;
            if (llamadas.length > 1) {
                const fechas = llamadas
                    .map(l => new Date(l.fechaLlamada))
                    .filter(f => !isNaN(f.getTime()))
                    .sort((a, b) => a - b);
                if (fechas.length > 1) {
                    const diff = fechas[fechas.length - 1] - fechas[0];
                    horasOptimizadas = Math.round(diff / (1000 * 60 * 60));
                }
            }

            // Actualizar estadísticas en el DOM
            const statRegistros = document.getElementById('stat-registros');
            const statConversion = document.getElementById('stat-conversion');
            const statMunicipios = document.getElementById('stat-municipios');
            const statHoras = document.getElementById('stat-horas');

            if (statRegistros) statRegistros.textContent = String(totalCandidatos);
            if (statConversion) statConversion.textContent = conversionRate + '%';
            if (statMunicipios) statMunicipios.textContent = String(totalMunicipios);
            if (statHoras) statHoras.textContent = (horasOptimizadas > 0 ? horasOptimizadas : 0) + 'h';

            // Agregar listeners a los botones de descarga
            document.querySelectorAll('.btn-dl').forEach(boton => {
                boton.addEventListener('click', (e) => {
                    const tipo = e.target.getAttribute('data-tipo');
                    const formato = e.target.getAttribute('data-formato');

                    let dataToDownload = [];
                    let filename = '';

                    if (tipo === 'candidatos') {
                        dataToDownload = candidatos;
                        filename = `candidatos_${new Date().toISOString().split('T')[0]}.${formato}`;
                    } else if (tipo === 'llamadas') {
                        dataToDownload = llamadas;
                        filename = `llamadas_${new Date().toISOString().split('T')[0]}.${formato}`;
                    } else if (tipo === 'eventos') {
                        dataToDownload = eventos;
                        filename = `eventos_${new Date().toISOString().split('T')[0]}.${formato}`;
                    }

                    if (formato === 'csv') {
                        downloadCSV(dataToDownload, filename);
                    } else if (formato === 'json') {
                        downloadJSON(dataToDownload, filename);
                    }
                });
            });

            if (window.lucide) lucide.createIcons();
        }
    };
}
