import { syncCandidatosFromSupabase, syncLlamadasFromSupabase } from '../services/supabase.js';

export async function initAnalyticsView() {
    const chartContainer = document.getElementById('chart-activity');
    if (!chartContainer) return;

    let candidatos = [];
    let llamadas = [];

    try {
        const [candidatosSupabase, llamadasSupabase] = await Promise.all([
            syncCandidatosFromSupabase(),
            syncLlamadasFromSupabase()
        ]);
        candidatos = Array.isArray(candidatosSupabase) ? candidatosSupabase : [];
        llamadas = Array.isArray(llamadasSupabase) ? llamadasSupabase : [];
    } catch (e) {
        console.warn('No se pudieron cargar datos en analitica desde Supabase:', e);
    }

    const interesados = candidatos.filter((c) => (c.estado_gestion || c.estado || '').toLowerCase().includes('interes')).length;
    const efectividad = candidatos.length > 0 ? Math.round((interesados / candidatos.length) * 100) : 0;

    const efectividadEl = document.getElementById('stat-efectividad');
    const tiempoEl = document.getElementById('stat-tiempo');
    if (efectividadEl) efectividadEl.textContent = `${efectividad}%`;
    if (tiempoEl) {
        let horas = 0;
        if (llamadas.length > 1) {
            const fechas = llamadas
                .map((l) => new Date(l.fechaLlamada))
                .filter((f) => !isNaN(f.getTime()))
                .sort((a, b) => a - b);
            if (fechas.length > 1) {
                const diff = fechas[fechas.length - 1] - fechas[0];
                horas = Math.round(diff / (1000 * 60 * 60));
            }
        }
        tiempoEl.textContent = `${horas}h`;
    }

    const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const last5Days = Array.from({ length: 5 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (4 - i));

        const pad = (n) => String(n).padStart(2, '0');
        return {
            dateStr: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
            dayName: i === 4 ? 'Hoy' : days[d.getDay()],
            count: 0
        };
    });

    llamadas.forEach((ll) => {
        if (!ll.fechaLlamada) return;
        const d = new Date(ll.fechaLlamada);
        if (isNaN(d.getTime())) return;

        const pad = (n) => String(n).padStart(2, '0');
        const str = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

        const match = last5Days.find((x) => x.dateStr === str);
        if (match) match.count++;
    });

    const maxCount = Math.max(1, ...last5Days.map((d) => d.count));

    const stats = last5Days.map((d) => ({
        day: d.dayName,
        value: maxCount === 0 ? 0 : (d.count / maxCount) * 100,
        label: `${d.count} llamadas`
    }));

    chartContainer.innerHTML = stats
        .map((s, index) => {
            return `<div class="bar-item relative group" id="bar-${index}" style="height: 0%; min-width: 60px;" title="${s.label}">`
                + `<div style="position:absolute; bottom:-40px; width:100%; text-align:center; font-size:11px; color:#64748B; font-weight:bold; white-space:nowrap; left:50%; transform:translateX(-50%);">${s.day}</div>`
                + `<div class="bar-tooltip z-10 hidden group-hover:block transition-all opacity-0 group-hover:opacity-100">${s.label}</div>`
                + '</div>';
        })
        .join('');

    setTimeout(() => {
        stats.forEach((s, index) => {
            const bar = document.getElementById(`bar-${index}`);
            if (bar) {
                const h = Math.max(5, s.value || 0);
                bar.style.height = `${h}%`;
                if (h > 90) bar.style.background = '#10B981';
            }
        });
    }, 100);

    if (window.lucide) lucide.createIcons();
}
