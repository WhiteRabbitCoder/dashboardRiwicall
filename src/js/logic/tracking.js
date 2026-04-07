import { syncCandidatosFromSupabase } from '../services/supabase.js';

export function initTrackingView() {
    const board = document.getElementById('kanban-board');
    const summary = document.getElementById('summary-steps');
    if (!board || !summary) return;

    // Función para renderizar el tablero Kanban
    const renderKanban = (listaCandidatos) => {
        // Mapeo de estados reales a columnas del kanban
        const pipelineData = {
            'pendiente': [],        // PENDIENTE: En proceso de contacto
            'agendado': [],         // AGENDADO: Cita confirmada
            'noInteresado': [],     // NO_INTERESADO: Descartó la convocatoria
            'descartado': []        // DESCARTADO: Proceso cerrado (incluye NUMERO_INCORRECTO)
        };

        listaCandidatos.forEach(can => {
            const estadoCandidato = (can.estado_gestion || can.estado || 'PENDIENTE').toUpperCase();

            if (estadoCandidato.includes('AGENDADO') || estadoCandidato.includes('CITA')) {
                pipelineData['agendado'].push(can);
            } else if (estadoCandidato.includes('NO_INTERESADO') || estadoCandidato.includes('DESCARTÓ')) {
                pipelineData['noInteresado'].push(can);
            } else if (estadoCandidato.includes('NUMERO_INCORRECTO') || estadoCandidato.includes('INCORRECTO')) {
                pipelineData['descartado'].push(can);
            } else if (estadoCandidato.includes('DESCARTADO') || estadoCandidato.includes('CERRADO')) {
                pipelineData['descartado'].push(can);
            } else {
                // PENDIENTE: En proceso de contacto (default)
                pipelineData['pendiente'].push(can);
            }
        });

        const columnas = [
            { key: 'pendiente', label: 'En proceso' },
            { key: 'agendado', label: 'Citas agendadas' },
            { key: 'noInteresado', label: 'No Interesados' },
            { key: 'descartado', label: 'Descartados' }
        ];

        summary.innerHTML = columnas.map((col, index) => `
            <div class="step-box">
                <span class="step-num">${pipelineData[col.key].length}</span>
                <span class="step-label">${col.label}</span>
            </div>
            ${index < columnas.length - 1 ? '<i data-lucide="arrow-right" class="text-slate-300 w-4 h-4"></i>' : ''}
        `).join('');

        board.innerHTML = columnas.map(col => `
            <div class="kanban-col">
                <div class="kanban-col-title">
                    <span>${col.label}</span>
                    <span class="col-count">${pipelineData[col.key].length}</span>
                </div>
                <div class="cards-list">
                    ${pipelineData[col.key].map(can => `
                        <div class="candidate-card p-3 mb-2 bg-white rounded-lg shadow-sm border border-slate-100">
                            <span class="can-name block font-bold text-slate-700 text-sm">${can.nombre}</span>
                            <span class="can-id block text-[10px] text-slate-400">CC: ${can.cedula}</span>
                            <span class="text-[10px] text-indigo-500 font-medium">${can.municipio || 'Medellín'}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        if (window.lucide) lucide.createIcons();
    };

    // Cargar datos locales primero
    const datosGuardados = localStorage.getItem('candidatos_riwicalls');
    const listaCandidatos = datosGuardados ? JSON.parse(datosGuardados) : [];
    renderKanban(listaCandidatos);

    // Intentar sincronizar desde Supabase
    syncCandidatosFromSupabase().then(candidatos => {
        if (Array.isArray(candidatos) && candidatos.length > 0) {
            localStorage.setItem('candidatos_riwicalls', JSON.stringify(candidatos));
            renderKanban(candidatos);
        }
    }).catch(error => {
        console.warn('No se pudo sincronizar candidatos desde Supabase en Tracking:', error);
    });
}
