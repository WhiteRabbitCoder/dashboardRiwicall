import {
    syncCandidatosFromSupabase,
    syncEventosFromSupabase,
    createEventoInSupabase,
    deleteEventoInSupabase,
    updateEventoInSupabase
} from '../services/supabase.js';

export async function initEventsView() {
    const grid = document.getElementById('grid-eventos');
    const modalEv = document.getElementById('modalNuevoEvento');
    const selectCand = document.getElementById('evCandidato');
    const btnCerrarEv = document.getElementById('btnCerrarEv');
    const btnGuardarEv = document.getElementById('btnGuardarEvento');
    const btnAbrirEv = document.getElementById('btn-add-event');

    let candidatosDisponibles = [];
    let eventosGuardados = [];
    let editandoEventoId = null;

    const cargarCandidatosDinamicos = () => {
        if (!selectCand) return;
        selectCand.innerHTML = '<option value="Ninguno">Ninguno</option>';
        candidatosDisponibles.forEach((c) => {
            const nombre = c.nombre || c.Nombre || 'Sin nombre';
            const opt = document.createElement('option');
            opt.value = nombre;
            opt.textContent = nombre;
            selectCand.appendChild(opt);
        });
    };

    const renderizarCards = (lista) => {
        if (!grid) return;
        grid.innerHTML = (lista || []).map((ev, index) => `
            <div class="event-card ${ev.destacado ? 'destacada' : ''}">
                <div class="card-header">
                    <h3 class="card-title">${ev.titulo || ev.nombre || ev.tipo_reunion || 'Evento'}</h3>
                    <span class="card-status">${ev.estado || 'Programado'}</span>
                </div>
                <p class="card-subtitle">${ev.tipo || 'Programacion'}</p>
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
        document.getElementById('evTipo').value = '';
        document.getElementById('evEstado').value = '';
        document.getElementById('evFecha').value = '';
        document.getElementById('evCandidato').value = 'Ninguno';
        document.getElementById('evDescripcion').value = '';
    };

    btnAbrirEv?.addEventListener('click', async () => {
        editandoEventoId = null;
        resetFormularioEvento();
        try {
            const candidatos = await syncCandidatosFromSupabase();
            candidatosDisponibles = Array.isArray(candidatos) ? candidatos : [];
        } catch (error) {
            console.warn('No se pudieron cargar candidatos para eventos desde Supabase:', error);
            candidatosDisponibles = [];
        }
        cargarCandidatosDinamicos();
        if (modalEv) modalEv.style.display = 'flex';
    });

    btnCerrarEv?.addEventListener('click', () => {
        if (modalEv) modalEv.style.display = 'none';
        editandoEventoId = null;
    });

    btnGuardarEv?.addEventListener('click', async () => {
        try {
            const datosEvento = {
                tipo_reunion: document.getElementById('evNombre')?.value,
                descripcion: document.getElementById('evDescripcion')?.value,
                estado: document.getElementById('evEstado')?.value || 'Programado',
                fecha_hora: document.getElementById('evFecha')?.value || new Date().toISOString()
            };

            if (!datosEvento.tipo_reunion || datosEvento.tipo_reunion.trim() === '') {
                alert('Por favor ingresa un nombre para el evento.');
                return;
            }

            if (editandoEventoId) {
                await updateEventoInSupabase(editandoEventoId, datosEvento);
            } else {
                await createEventoInSupabase(datosEvento);
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
            document.getElementById('evNombre').value = ev.titulo || ev.nombre || ev.tipo_reunion || '';
            document.getElementById('evTipo').value = ev.tipo || '';
            document.getElementById('evEstado').value = ev.estado || '';
            document.getElementById('evFecha').value = ev.fecha || ev.fecha_hora || '';
            document.getElementById('evDescripcion').value = ev.descripcion || '';

            try {
                const candidatos = await syncCandidatosFromSupabase();
                candidatosDisponibles = Array.isArray(candidatos) ? candidatos : [];
            } catch (error) {
                candidatosDisponibles = [];
            }
            cargarCandidatosDinamicos();
            document.getElementById('evCandidato').value = ev.candidato || 'Ninguno';

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

    renderizarCards(eventosGuardados);
}
