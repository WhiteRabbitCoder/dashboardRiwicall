import { syncCandidatosFromSupabase, syncLlamadasFromSupabase } from '../services/supabase.js';

export async function initReportesView() {
    let candidatos = [];
    let llamadas = [];

    try {
        const [candidatosSupabase, llamadasSupabase] = await Promise.all([
            syncCandidatosFromSupabase(),
            syncLlamadasFromSupabase()
        ]);
        candidatos = Array.isArray(candidatosSupabase) ? candidatosSupabase : [];
        llamadas = Array.isArray(llamadasSupabase) ? llamadasSupabase : [];
    } catch (error) {
        console.warn('No se pudieron cargar reportes desde Supabase:', error);
    }

    // Calcular estadísticas reales
    const totalCandidatos = candidatos.length;

    // Conversión: candidatos admitidos / total
    const admitidos = candidatos.filter(c => (c.estado_gestion || c.estado || '').toLowerCase().includes('admitido')).length;
    const conversionRate = totalCandidatos > 0 ? Math.round((admitidos / totalCandidatos) * 100) : 0;

    // Municipios únicos
    const municipios = new Set(candidatos.map(c => c.municipio).filter(m => m));
    const totalMunicipios = municipios.size;

    // Tiempo promedio optimizado (en horas desde primera a última llamada)
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

    // Inyectar datos en los elementos por ID
    const statRegistros = document.getElementById('stat-registros');
    const statConversion = document.getElementById('stat-conversion');
    const statMunicipios = document.getElementById('stat-municipios');
    const statHoras = document.getElementById('stat-horas');

    if (statRegistros) statRegistros.textContent = String(totalCandidatos);
    if (statConversion) statConversion.textContent = conversionRate + '%';
    if (statMunicipios) statMunicipios.textContent = String(totalMunicipios);
    if (statHoras) statHoras.textContent = horasOptimizadas + 'h';

    const botones = document.querySelectorAll('.btn-dl');
    botones.forEach(boton => {
        boton.addEventListener('click', (e) => {
            const tipo = e.target.closest('.card-descarga').querySelector('h3').innerText;
            const formato = e.target.innerText;
            console.log(`Descargando reporte: ${tipo} en formato ${formato}`);
        });
    });
    if (window.lucide) lucide.createIcons();
}
