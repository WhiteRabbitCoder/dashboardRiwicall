import { syncCandidatosFromSupabase, syncLlamadasFromSupabase } from '../services/supabase.js';

export async function initDashboard() {
    // Render inicial vacío mientras llega Supabase
    let candidates = [];
    let calls = [];

    // Renderizar inmediatamente con datos locales
    renderMetrics(candidates, calls);
    renderGenderChart(candidates);
    renderAgeBars(candidates);
    renderSecondRow(candidates);
    renderThirdRow(candidates);
    renderCandidateStates(candidates);
    renderCallStates(calls);
    initTooltips();
    if (window.lucide) window.lucide.createIcons();

    // Cargar datos desde Supabase
    try {
        [candidates, calls] = await Promise.all([
            syncCandidatosFromSupabase(),
            syncLlamadasFromSupabase()
        ]);

        renderMetrics(candidates, calls);
        renderGenderChart(candidates);
        renderAgeBars(candidates);
        renderSecondRow(candidates);
        renderThirdRow(candidates);
        renderCandidateStates(candidates);
        renderCallStates(calls);
        initTooltips();
        if (window.lucide) window.lucide.createIcons();
    } catch (error) {
        console.warn('No fue posible cargar dashboard desde Supabase:', error);
    }
}

function renderMetrics(candidates, calls) {
    const total = candidates.length;
    const interested = candidates.filter((candidate) => getPhase(candidate).includes('interes')).length;
    const completedCalls = calls.length || candidates.filter((candidate) => (candidate.intentos_llamada || 0) > 0).length;
    const admitted = candidates.filter((candidate) => getPhase(candidate).includes('admit')).length;

    const metricContainer = document.getElementById('metricas-container');
    if (!metricContainer) return;

    metricContainer.innerHTML = `
        ${renderMetric('Total Candidatos', total, 'users')}
        ${renderMetric('Interesados', interested, 'star')}
        ${renderMetric('Llamadas Realizadas', completedCalls, 'phone-call')}
        ${renderMetric('Admitidos', admitted, 'check-circle')}
    `;
}

function renderGenderChart(candidates) {
    const container = document.getElementById('gender-chart-container');
    if (!container) return;

    let hombres = 0;
    let mujeres = 0;

    candidates.forEach((c) => {
        const generoId = String(c.genero || c.genero_id || '').toUpperCase();
        if (generoId === 'M' || generoId === 'MASCULINO') hombres++;
        else if (generoId === 'F' || generoId === 'FEMENINO') mujeres++;
    });

    const total = hombres + mujeres || 1;
    const pM = Math.round((hombres / total) * 100);
    const pF = 100 - pM;

    container.innerHTML = `
        <h4 class="text-slate-500 text-[10px] font-black uppercase tracking-widest self-start mb-10">Distribución por Género</h4>
        <div class="relative w-40 h-40 group chart-hover-zone" data-tip-hombres="${hombres} Hombres (${hombres === 0 && mujeres === 0 ? 0 : pM}%)" data-tip-mujeres="${mujeres} Mujeres (${hombres === 0 && mujeres === 0 ? 0 : pF}%)">
            <div class="w-full h-full rounded-full cursor-pointer transition-transform duration-300 hover:scale-105" 
                style="background: conic-gradient(#6366F1 0% ${pM}%, #71C6A0 ${pM}% 100%); 
                    mask-image: radial-gradient(transparent 45%, black 46%); 
                    -webkit-mask-image: radial-gradient(transparent 45%, black 46%);">
            </div>
            <div style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center;">
                <span style="font-weight: 900; font-size: 15px; color: #6366F1;">${hombres}</span>
                <div style="width: 1.5px; height: 15px; background: #6366F1;"></div>
            </div>
            <div style="position: absolute; bottom: -25px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center;">
                <div style="width: 1.5px; height: 15px; background: #71C6A0;"></div>
                <span style="font-weight: 900; font-size: 15px; color: #71C6A0;">${mujeres}</span>
            </div>
        </div>
        <div class="mt-12 flex gap-6">
            <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm" style="background: #6366F1;"></div><span class="text-[10px] font-bold text-slate-400 uppercase">Hombres</span></div>
            <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm" style="background: #71C6A0;"></div><span class="text-[10px] font-bold text-slate-400 uppercase">Mujeres</span></div>
        </div>
    `;
}

function renderAgeBars(candidates) {
    const ageRanges = [
        { range: '17-22', count: 0 },
        { range: '22-30', count: 0 },
        { range: '30-35', count: 0 }
    ];

    candidates.forEach((candidate) => {
        const age = Number(candidate.edad);
        if (!Number.isFinite(age)) return;
        if (age <= 22) ageRanges[0].count += 1;
        else if (age <= 30) ageRanges[1].count += 1;
        else ageRanges[2].count += 1;
    });

    const maxCount = Math.max(1, ...ageRanges.map((entry) => entry.count));
    const ageContainer = document.getElementById('age-chart-container');
    if (!ageContainer) return;

    const barsHtml = ageRanges.map((entry) => {
        const heightPercent = `${Math.max(8, (entry.count / maxCount) * 100)}%`;
        return `
            <div class="chart-hover-zone group relative flex flex-col items-center w-40" style="height: ${heightPercent};"
                data-tip-hombres="${entry.count} Candidatos" data-tip-mujeres="Rango ${entry.range}">
                <div class="w-full bg-[#6366F1] rounded-lg h-full cursor-pointer hover:brightness-110 shadow-sm"></div>
            </div>
        `;
    }).join('');

    ageContainer.innerHTML = `
        <h4 class="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6">Rangos de Edad</h4>
        <div class="flex h-48 w-full">
            <div class="flex flex-col justify-between text-[10px] font-bold text-slate-400 pr-2 pb-6">
                <span>${maxCount}</span><span>${Math.max(0, Math.round(maxCount*0.75))}</span><span>${Math.max(0, Math.round(maxCount*0.5))}</span><span>${Math.max(0, Math.round(maxCount*0.25))}</span><span>0</span>
            </div>
            <div class="flex-1 relative border-l border-b border-slate-200">
                <div class="relative z-10 flex items-end justify-around h-full w-full px-4">
                    ${barsHtml}
                </div>
            </div>
        </div>
        <div class="flex justify-around text-[10px] font-bold text-slate-400 uppercase tracking-tighter ml-6 mt-2">
            <span class="w-20 text-center">17-22</span><span class="w-20 text-center">22-30</span><span class="w-20 text-center">30-35</span>
        </div>
    `;
}

function renderSecondRow(candidates) {
    const container = document.getElementById('second-row-container');
    if (!container) return;
    container.innerHTML = `
        <div>${renderDonutChartByField(candidates, 'jornada', 'Jornada', '#6366F1', '#71C6A0')}</div>
        <div>${renderBarChartByField(candidates, 'educacion', 'Nivel Educativo', '#71C6A0')}</div>
        <div>${renderDonutChartByField(candidates, 'municipio', 'Ubicación', '#6366F1', '#71C6A0')}</div>
    `;
}

function renderThirdRow(candidates) {
    const container = document.getElementById('third-row-container');
    if (!container) return;
    container.innerHTML = `
        <div>${renderBarChartByField(candidates, 'programacion', 'Nivel de Programación', '#E0A7FF')}</div>
        <div>${renderRegistrationsChart(candidates)}</div>
    `;
}

function renderDonutChartByField(candidates, field, title, firstColor, secondColor) {
    const entries = getTopEntries(candidates, field, 2);
    const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;
    const firstPercent = Math.round(((entries[0]?.[1] || 0) / total) * 100);
    const secondPercent = 100 - firstPercent;
    const firstLabel = entries[0]?.[0] || 'Sin dato';
    const secondLabel = entries[1]?.[0] || 'Sin dato';

    return `
        <div class="card flex flex-col items-center">
            <h4 class="text-slate-500 text-[10px] font-black uppercase tracking-widest self-start mb-10">${title}</h4>
            <div class="relative w-40 h-40 group chart-hover-zone" data-tip-hombres="${entries[0]?.[1] || 0} ${firstLabel}" data-tip-mujeres="${entries[1]?.[1] || 0} ${secondLabel}">
                <div class="w-full h-full rounded-full cursor-pointer" style="background: conic-gradient(${firstColor} 0% ${firstPercent}%, ${secondColor} ${firstPercent}% 100%);"></div>
            </div>
            <div class="mt-12 flex gap-6">
                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm" style="background: ${firstColor};"></div><span class="text-[10px] font-bold text-slate-400 uppercase">${firstLabel}</span></div>
                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm" style="background: ${secondColor};"></div><span class="text-[10px] font-bold text-slate-400 uppercase">${secondLabel}</span></div>
            </div>
        </div>
    `;
}

function renderBarChartByField(candidates, field, title, color) {
    const entries = getTopEntries(candidates, field, 4);
    const maxCount = Math.max(1, ...entries.map(([, count]) => count));

    return `
        <div class="card flex flex-col h-full">
            <h4 class="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6">${title}</h4>
            <div class="flex h-48 w-full">
                <div class="flex flex-col justify-between text-[10px] font-bold text-slate-400 pr-3 pb-6">
                    <span>${maxCount}</span><span>${Math.max(0, maxCount - 1)}</span><span>${Math.max(0, maxCount - 2)}</span><span>1</span><span>0</span>
                </div>
                <div class="flex-1 relative border-l border-b border-slate-200">
                    <div class="relative z-10 flex items-end justify-around h-full w-full px-2">
                        ${entries.map(([label, count]) => `
                            <div class="chart-hover-zone group relative w-14" style="height: ${Math.max(8, (count / maxCount) * 100)}%;" data-tip-hombres="${count} Candidatos" data-tip-mujeres="${label}">
                                <div class="w-full rounded-t-md h-full transition-all hover:brightness-105 cursor-pointer" style="background: ${color};"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="flex justify-around text-[9px] font-bold text-slate-400 uppercase ml-12 mt-2">${entries.map(([label]) => `<span>${label}</span>`).join('')}</div>
        </div>
    `;
}

function renderRegistrationsChart(candidates) {
    const days = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
    const perDay = new Map(days.map((day) => [day, 0]));

    candidates.forEach((candidate) => {
        const rawDate = candidate.created_at || candidate.fecha || '';
        if (!rawDate) return;
        const parsedDate = new Date(rawDate);
        if (Number.isNaN(parsedDate.getTime())) return;
        const dayLabel = days[(parsedDate.getDay() + 6) % 7];
        perDay.set(dayLabel, (perDay.get(dayLabel) || 0) + 1);
    });

    return `
        <div class="card flex flex-col h-full">
            <h4 class="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6">Inscripciones</h4>
            <div class="flex h-48 w-full">
                <div class="flex flex-col justify-between text-[10px] font-bold text-slate-400 pr-3 pb-6"><span>4</span><span>3</span><span>2</span><span>1</span><span>0</span></div>
                <div class="flex-1 relative border-l border-b border-slate-200">
                    <div class="absolute bottom-0 w-full h-[2px] bg-indigo-500"></div>
                    <div class="relative z-10 flex items-end justify-around h-full w-full px-2">
                        ${days.map((day) => `
                            <div class="chart-hover-zone flex flex-col items-center justify-end h-full pb-0 mb-[-6px]" data-tip-hombres="${perDay.get(day)} Candidatos" data-tip-mujeres="Día: ${day}">
                                <div class="w-3 h-3 bg-indigo-500 rounded-full border-2 border-white shadow-sm cursor-pointer hover:scale-150 transition-transform"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="flex justify-around text-[9px] font-bold text-slate-400 uppercase ml-12 mt-2">${days.map((day) => `<span>${day}</span>`).join('')}</div>
        </div>
    `;
}

function renderCandidateStates(candidates) {
    const container = document.getElementById('estado-candidatos-container');
    if (!container) return;

    const labels = ['Filtro CI', 'Inscrito', 'Llamado', 'Interesado', 'En proceso', 'Admitido', 'No interesado'];
    const counts = new Map(labels.map((label) => [label, 0]));

    candidates.forEach((candidate) => {
        const phase = getPhase(candidate);
        if (phase.includes('filtro') || phase.includes('ci')) counts.set('Filtro CI', counts.get('Filtro CI') + 1);
        if (phase.includes('inscr')) counts.set('Inscrito', counts.get('Inscrito') + 1);
        if (phase.includes('llam')) counts.set('Llamado', counts.get('Llamado') + 1);
        if (phase.includes('interes')) counts.set('Interesado', counts.get('Interesado') + 1);
        if (phase.includes('proceso')) counts.set('En proceso', counts.get('En proceso') + 1);
        if (phase.includes('admit')) counts.set('Admitido', counts.get('Admitido') + 1);
        if (phase.includes('no') && phase.includes('interes')) counts.set('No interesado', counts.get('No interesado') + 1);
    });

    const maxCount = Math.max(1, ...Array.from(counts.values()));
    const barsHtml = labels.map((label) => {
        const count = counts.get(label) || 0;
        return `
            <div class="chart-hover-zone group relative h-6 w-full" data-tip-hombres="${count} Candidatos" data-tip-mujeres="Estado: ${label}">
                <div class="h-full bg-[#6366F1] rounded-r-full transition-all hover:brightness-110 cursor-pointer shadow-sm" style="width: ${(count / maxCount) * 100}%;"></div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <h4 class="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6">Estado de Candidatos</h4>
        <div class="flex flex-1 pr-4">
            <div class="flex flex-col justify-between text-[10px] font-bold text-slate-400 pr-3 pb-6 text-right w-24">
                <span>Filtro CI</span><span>Inscrito</span><span>Llamado</span><span>Interesado</span><span>En proceso</span><span>Admitido</span><span>No interesado</span>
            </div>
            <div class="flex-1 relative border-l border-b border-slate-200">
                <div class="absolute inset-0 flex justify-between pointer-events-none">
                    <div class="border-l border-slate-100 border-dashed h-full"></div>
                    <div class="border-l border-slate-100 border-dashed h-full"></div>
                    <div class="border-l border-slate-100 border-dashed h-full"></div>
                    <div class="border-l border-slate-100 border-dashed h-full"></div>
                </div>
                <div class="relative z-10 flex flex-col justify-between h-full py-2">
                    ${barsHtml}
                </div>
            </div>
        </div>
        <div class="flex justify-between text-[10px] font-bold text-slate-400 ml-[104px] mt-2 pr-4">
            <span>0</span><span>${(maxCount * 0.25).toFixed(1)}</span><span>${(maxCount * 0.5).toFixed(1)}</span><span>${(maxCount * 0.75).toFixed(1)}</span><span>${maxCount}</span>
        </div>
    `;
}

function renderCallStates(calls) {
    const callStateContainer = document.getElementById('estado-llamadas-container');
    if (!callStateContainer) return;

    const statuses = ['Pendiente', 'Llamado', 'No contesta', 'Interesado', 'No interesado'];
    const colors = ['#6366F1', '#71C6A0', '#E9C46A', '#D89DED', '#E76F51'];
    const countByStatus = new Map(statuses.map((status) => [status, 0]));

    calls.forEach((call) => {
        const status = (call.estado || '').toLowerCase();
        if (status.includes('llam')) countByStatus.set('Llamado', countByStatus.get('Llamado') + 1);
        else if (status.includes('contesta')) countByStatus.set('No contesta', countByStatus.get('No contesta') + 1);
        else if (status.includes('interesado')) countByStatus.set('Interesado', countByStatus.get('Interesado') + 1);
        else if (status.includes('no interesado')) countByStatus.set('No interesado', countByStatus.get('No interesado') + 1);
        else countByStatus.set('Pendiente', countByStatus.get('Pendiente') + 1);
    });

    const total = calls.length;
    let percentageStart = 0;
    const slices = statuses.map((status, index) => {
        const value = countByStatus.get(status) || 0;
        const percentage = total ? (value / total) * 100 : 0;
        const start = percentageStart;
        const end = percentageStart + percentage;
        percentageStart = end;
        return { status, value, color: colors[index], start, end };
    });

    const gradient = slices.reduce((result, slice) => `${result}${slice.color} ${slice.start}% ${slice.end}%, `, '').slice(0, -2) || '#6366F1 0% 100%';
    const slicesAttribute = JSON.stringify(slices.map((slice) => ({
        label: `${slice.status}: ${slice.value}`,
        color: slice.color,
        start: slice.start,
        end: slice.end
    })));

    callStateContainer.innerHTML = `
        <h4 class="text-slate-500 text-[10px] font-black uppercase tracking-widest self-start mb-6">Estado de Llamadas</h4>
        <div class="relative w-48 h-48">
            <div class="absolute inset-0 rounded-full chart-hover-zone cursor-pointer"
                style="background: conic-gradient(${gradient}); mask-image: radial-gradient(transparent 58%, black 60%); -webkit-mask-image: radial-gradient(transparent 58%, black 60%);"
                data-slices='${slicesAttribute}'
                data-center-tip="${total} Total"></div>
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div class="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <span class="text-slate-400 font-bold text-sm">${total} Total</span>
                </div>
            </div>
        </div>
        <div class="mt-8 grid grid-cols-3 gap-x-4 gap-y-2">
            ${slices.map((slice) => `
                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm" style="background:${slice.color}"></div><span class="text-[9px] font-bold text-slate-400 uppercase">${slice.status}</span></div>
            `).join('')}
        </div>
    `;
}

function renderMetric(label, value, icon) {
    return `
        <div class="card flex justify-between items-center">
            <div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${label}</p>
                <h3 class="text-2xl font-black text-slate-800 mt-1">${value}</h3>
            </div>
            <div class="p-3 bg-indigo-50 rounded-xl"><i data-lucide="${icon}" class="metric-icon"></i></div>
        </div>
    `;
}

function getTopEntries(items, field, limit) {
    const counts = new Map();
    items.forEach((item) => {
        const key = String(item[field] || 'Sin dato').trim() || 'Sin dato';
        counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
}

function getPhase(candidate) {
    return String(candidate.fase_actual || candidate.estado || '').toLowerCase();
}

function initTooltips() {
    const oldTooltip = document.querySelector('.custom-tooltip');
    if (oldTooltip) oldTooltip.remove();

    const tooltip = document.createElement('div');
    tooltip.className = 'custom-tooltip';
    Object.assign(tooltip.style, {
        position: 'fixed',
        background: '#1e293b',
        color: 'white',
        padding: '10px 14px',
        borderRadius: '8px',
        fontSize: '12px',
        zIndex: '10000',
        display: 'none',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
        pointerEvents: 'none',
        fontFamily: 'Inter, sans-serif'
    });
    document.body.appendChild(tooltip);

    document.querySelectorAll('.chart-hover-zone').forEach((zone) => {
        zone.addEventListener('mousemove', (event) => {
            const rect = zone.getBoundingClientRect();
            const show = (text, color) => {
                tooltip.style.display = 'block';
                tooltip.style.left = `${event.clientX + 15}px`;
                tooltip.style.top = `${event.clientY + 15}px`;
                tooltip.innerHTML = `
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="width:10px;height:10px;border-radius:2px;background:${color}"></span>
                        <span style="font-weight:700;font-size:13px;">${text}</span>
                    </div>
                `;
            };

            if (zone.dataset.tip) {
                show(zone.dataset.tip, zone.dataset.color || '#6366F1');
                return;
            }

            if (zone.dataset.slices) {
                let slices;
                try {
                    slices = JSON.parse(zone.dataset.slices);
                } catch (error) {
                    slices = null;
                }

                if (Array.isArray(slices)) {
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const deltaX = event.clientX - centerX;
                    const deltaY = event.clientY - centerY;
                    const distance = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
                    const outerRadius = rect.width / 2;
                    const innerRadius = outerRadius * 0.58;

                    if (distance < innerRadius) {
                        const centerTip = zone.dataset.centerTip || '';
                        if (centerTip) show(centerTip, '#111827');
                        else tooltip.style.display = 'none';
                        return;
                    }

                    const angle = (Math.atan2(deltaY, deltaX) * 180 / Math.PI + 360 + 90) % 360;
                    const percent = (angle / 360) * 100;
                    const foundSlice = slices.find((slice) => percent >= slice.start && percent < slice.end);
                    if (foundSlice) {
                        show(foundSlice.label, foundSlice.color || '#6366F1');
                        return;
                    }
                }
            }

            const isCircular = Math.abs(rect.width - rect.height) < 10;
            const useSideA = isCircular
                ? event.clientX - rect.left > rect.width / 2
                : event.clientY - rect.top < rect.height / 2;
            const textToShow = zone.dataset.tip || (useSideA ? zone.dataset.tipHombres : zone.dataset.tipMujeres);
            const pointColor = zone.dataset.color || (useSideA ? '#6366F1' : '#71C6A0');
            if (textToShow) show(textToShow, pointColor);
            else tooltip.style.display = 'none';
        });

        zone.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    });
}
