import {
    syncCandidatosFromSupabase,
    syncEventosFromSupabase,
    createEventoInSupabase,
    deleteEventoInSupabase,
    updateEventoInSupabase,
    fetchSupabaseTable,
    createCandidatoEventoInSupabase,
    deleteCandidatoEventoByEventoInSupabase
} from '../services/supabase.js';

export async function initEventsView() {
    const grid = document.getElementById('grid-eventos');
    const modalEv = document.getElementById('modalNuevoEvento');
    const selectCand = document.getElementById('evCandidato');
    const btnCerrarEv = document.getElementById('btnCerrarEv');
    const btnGuardarEv = document.getElementById('btnGuardarEvento');
    const btnAbrirEv = document.getElementById('btn-add-event');

    let candidatosDisponibles = [];
    let sedesDisponibles = [];
    let eventosGuardados = [];
    let editandoEventoId = null;
    let tiposReunionDisponibles = [];

    const toDatetimeLocalValue = (value) => {
        if (!value) return '';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const mapUiStatusToDb = (value) => {
        const normalized = String(value || '').toLowerCase();
        if (normalized.includes('complet')) return 'COMPLETO';
        if (normalized.includes('cancel')) return 'CANCELADO';
        return 'DISPONIBLE';
    };

    const mapDbStatusToUi = (value) => {
        const normalized = String(value || '').toUpperCase();
        if (normalized === 'COMPLETO') return 'Completado';
        if (normalized === 'CANCELADO') return 'Cancelado';
        return 'Programado';
    };

    const cargarCandidatosDinamicos = () => {
        if (!selectCand) return;
        selectCand.innerHTML = '<option value="">Ninguno</option>';
        candidatosDisponibles.forEach((c) => {
            const nombre = c.nombre || c.Nombre || 'Sin nombre';
            const opt = document.createElement('option');
            opt.value = String(c.id || '');
            opt.textContent = nombre;
            selectCand.appendChild(opt);
        });
    };

    const cargarTiposReunionDinamicos = () => {
        const selectTipo = document.getElementById('evTipo');
        if (!selectTipo) return;
        if (!tiposReunionDisponibles.length) {
            selectTipo.innerHTML = '<option value="">Sin tipos disponibles</option>';
            return;
        }
        selectTipo.innerHTML = (tiposReunionDisponibles || [])
            .map((item) => `<option value="${item.id}">${item.descripcion || item.codigo || `Tipo ${item.id}`}</option>`)
            .join('');
    };

    const cargarSedesDinamicas = () => {
        const selectSede = document.getElementById('evSede');
        if (!selectSede) return;
        if (!sedesDisponibles.length) {
            selectSede.innerHTML = '<option value="">Sin sedes disponibles</option>';
            return;
        }
        selectSede.innerHTML = (sedesDisponibles || [])
            .map((item) => `<option value="${item.id}">${item.nombre || item.descripcion || item.codigo || `Sede ${item.id}`}</option>`)
            .join('');
    };

    const renderizarCards = (lista) => {
        if (!grid) return;
        grid.innerHTML = (lista || []).map((ev, index) => `
            <div class="event-card ${ev.destacado ? 'destacada' : ''}">
                <div class="card-header">
                    <h3 class="card-title">${ev.titulo || ev.nombre || ev.tipo_reunion || 'Evento'}</h3>
                    <span class="card-status">${mapDbStatusToUi(ev.estado_db || ev.estado)}</span>
                </div>
                <p class="card-subtitle">${ev.sede || 'Sede no asignada'} · ${ev.tipo || 'Programacion'}</p>
                <div class="info-row"><i data-lucide="calendar" class="w-4 h-4"></i><span>${ev.fecha || ev.fecha_hora || ''}</span></div>
                ${ev.candidato ? `<div class="info-row"><i data-lucide="user" class="w-4 h-4"></i><span>Candidato: ${ev.candidato}</span></div>` : ''}
                <p class="card-desc">${ev.descripcion || ''}</p>
                <div class="card-actions">
                    <i data-lucide="pencil" class="w-4 h-4 edit-ev" data-index="${index}" data-id="${ev.id || ''}"></i>
                    <i data-lucide="trash-2" class="w-4 h-4 delete-ev" data-index="${index}" data-id="${ev.id || ''}"></i>
                </div>
            </div>
        `).join('');

        if (window.lucide) lucide.createIcons();
    };

    const resetFormularioEvento = () => {
        document.getElementById('evNombre').value = '';
        const selectTipo = document.getElementById('evTipo');
        if (selectTipo && selectTipo.options.length) {
            selectTipo.value = selectTipo.options[0].value;
        }
        document.getElementById('evEstado').value = '';
        document.getElementById('evFecha').value = '';
        const selectSede = document.getElementById('evSede');
        if (selectSede && selectSede.options.length) {
            selectSede.value = selectSede.options[0].value;
        }
        document.getElementById('evCandidato').value = '';
        document.getElementById('evDescripcion').value = '';
    };

    const buildEventoPayload = () => {
        const tipoReunionId = Number(document.getElementById('evTipo')?.value || 0);
        if (!Number.isInteger(tipoReunionId) || tipoReunionId <= 0) {
            throw new Error('Selecciona un tipo de reunion valido.');
        }

        const sedeId = Number(document.getElementById('evSede')?.value || 0);
        if (!Number.isInteger(sedeId) || sedeId <= 0) {
            throw new Error('Selecciona una sede valida.');
        }

        const fechaInput = document.getElementById('evFecha')?.value;
        const fechaIso = fechaInput ? new Date(fechaInput).toISOString() : new Date().toISOString();
        const nombreEvento = String(document.getElementById('evNombre')?.value || '').trim();
        const descripcion = String(document.getElementById('evDescripcion')?.value || '').trim();

        return {
            tipo_reunion_id: tipoReunionId,
            sede_id: sedeId,
            estado: mapUiStatusToDb(document.getElementById('evEstado')?.value),
            fecha_hora: fechaIso,
            capacidad_total: 30,
            descripcion: descripcion || nombreEvento || null
        };
    };

    btnAbrirEv?.addEventListener('click', async () => {
        editandoEventoId = null;
        try {
            const [candidatos, tiposReunion, sedes] = await Promise.all([
                syncCandidatosFromSupabase(),
                fetchSupabaseTable('tipos_reunion'),
                fetchSupabaseTable('sedes')
            ]);
            candidatosDisponibles = Array.isArray(candidatos) ? candidatos : [];
            tiposReunionDisponibles = Array.isArray(tiposReunion) ? tiposReunion : [];
            sedesDisponibles = Array.isArray(sedes) ? sedes : [];
        } catch (error) {
            console.warn('No se pudieron cargar candidatos para eventos desde Supabase:', error);
            candidatosDisponibles = [];
            tiposReunionDisponibles = [];
            sedesDisponibles = [];
        }
        cargarCandidatosDinamicos();
        cargarTiposReunionDinamicos();
        cargarSedesDinamicas();
        resetFormularioEvento();
        if (modalEv) modalEv.style.display = 'flex';
    });

    btnCerrarEv?.addEventListener('click', () => {
        if (modalEv) modalEv.style.display = 'none';
        editandoEventoId = null;
    });

    btnGuardarEv?.addEventListener('click', async () => {
        try {
            const datosEvento = buildEventoPayload();
            const candidatoId = String(document.getElementById('evCandidato')?.value || '').trim();
            let eventoGuardadoId = editandoEventoId;

            if (editandoEventoId) {
                const updated = await updateEventoInSupabase(editandoEventoId, datosEvento);
                eventoGuardadoId = updated?.id || editandoEventoId;
            } else {
                const created = await createEventoInSupabase(datosEvento);
                eventoGuardadoId = created?.id || null;
            }

            if (eventoGuardadoId) {
                await deleteCandidatoEventoByEventoInSupabase(eventoGuardadoId);
                if (candidatoId) {
                    await createCandidatoEventoInSupabase({
                        candidato_id: candidatoId,
                        evento_id: eventoGuardadoId,
                        tipo_reunion_id: datosEvento.tipo_reunion_id,
                        estado: 'CONFIRMADO'
                    });
                }
            }

            const eventosSupabase = await syncEventosFromSupabase();
            eventosGuardados = Array.isArray(eventosSupabase) ? eventosSupabase : [];
            renderizarCards(eventosGuardados);

            if (modalEv) modalEv.style.display = 'none';
            editandoEventoId = null;
        } catch (error) {
            alert(`Error al guardar el evento: ${error.message}`);
        }
    });

    grid?.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-ev');
        const editBtn = e.target.closest('.edit-ev');

        if (deleteBtn) {
            const index = Number(deleteBtn.getAttribute('data-index'));
            const eventoId = deleteBtn.getAttribute('data-id');
            if (!Number.isInteger(index) || index < 0) return;

            if (confirm('¿Seguro que quieres eliminar este evento?')) {
                try {
                    if (eventoId) await deleteEventoInSupabase(eventoId);
                    const eventosSupabase = await syncEventosFromSupabase();
                    eventosGuardados = Array.isArray(eventosSupabase) ? eventosSupabase : [];
                    renderizarCards(eventosGuardados);
                } catch (err) {
                    alert(`No se pudo eliminar el evento: ${err.message}`);
                }
            }
        }

        if (editBtn) {
            const index = Number(editBtn.getAttribute('data-index'));
            const eventoId = editBtn.getAttribute('data-id');
            if (!Number.isInteger(index) || index < 0) return;

            const ev = eventosGuardados[index];
            if (!ev) return;

            editandoEventoId = eventoId || ev.id || null;
            document.getElementById('evNombre').value = ev.titulo || ev.nombre || '';
            document.getElementById('evEstado').value = mapDbStatusToUi(ev.estado_db || ev.estado);
            document.getElementById('evFecha').value = toDatetimeLocalValue(ev.fecha || ev.fecha_hora);
            document.getElementById('evDescripcion').value = ev.descripcion || '';

            try {
                const [candidatos, tiposReunion, sedes] = await Promise.all([
                    syncCandidatosFromSupabase(),
                    fetchSupabaseTable('tipos_reunion'),
                    fetchSupabaseTable('sedes')
                ]);
                candidatosDisponibles = Array.isArray(candidatos) ? candidatos : [];
                tiposReunionDisponibles = Array.isArray(tiposReunion) ? tiposReunion : [];
                sedesDisponibles = Array.isArray(sedes) ? sedes : [];
            } catch (error) {
                candidatosDisponibles = [];
                tiposReunionDisponibles = [];
                sedesDisponibles = [];
            }
            cargarCandidatosDinamicos();
            cargarTiposReunionDinamicos();
            cargarSedesDinamicas();
            document.getElementById('evTipo').value = String(ev.tipo_reunion_id || tiposReunionDisponibles?.[0]?.id || '');
            document.getElementById('evSede').value = String(ev.sede_id || sedesDisponibles?.[0]?.id || '');
            document.getElementById('evCandidato').value = String(ev.candidato_id || '');

            if (modalEv) modalEv.style.display = 'flex';
        }
    });

    try {
        const eventosSupabase = await syncEventosFromSupabase();
        eventosGuardados = Array.isArray(eventosSupabase) ? eventosSupabase : [];
    } catch (error) {
        console.warn('No se pudieron cargar eventos desde Supabase:', error);
        eventosGuardados = [];
    }

    try {
        const sedes = await fetchSupabaseTable('sedes');
        sedesDisponibles = Array.isArray(sedes) ? sedes : [];
    } catch (error) {
        sedesDisponibles = [];
    }
    cargarSedesDinamicas();

    renderizarCards(eventosGuardados);
}
