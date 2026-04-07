import { syncEventosFromSupabase, createEventoInSupabase, deleteEventoInSupabase, updateEventoInSupabase } from '../services/supabase.js';

export function initEventsView() {
    // Elementos del DOM
    const grid = document.getElementById('grid-eventos');
    const modalEv = document.getElementById('modalNuevoEvento');
    const selectCand = document.getElementById('evCandidato');
    const btnCerrarEv = document.getElementById('btnCerrarEv');
    const btnGuardarEv = document.getElementById('btnGuardarEvento');
    const btnAbrirEv = document.getElementById('btn-add-event');

    const cargarCandidatosDinamicos = () => {
        const lista = JSON.parse(localStorage.getItem('candidatos_riwicalls')) || [];
        if (!selectCand) return;
        selectCand.innerHTML = '<option value="Ninguno">Ninguno</option>';
        lista.forEach(c => {
            const nombre = c.nombre || c.Nombre || "Sin nombre";
            const opt = document.createElement('option'); opt.value = nombre; opt.textContent = nombre; selectCand.appendChild(opt);
        });
    };

    const renderizarCards = (lista) => {
        if (!grid) return;
        grid.innerHTML = lista.map((ev, index) => `
            <div class="event-card ${ev.destacado ? 'destacada' : ''}">
                <div class="card-header">
                    <h3 class="card-title">${ev.titulo || ev.nombre}</h3>
                    <span class="card-status">${ev.estado}</span>
                </div>
                <p class="card-subtitle">${ev.tipo}</p>
                <div class="info-row"><i data-lucide="calendar" class="w-4 h-4"></i><span>${ev.fecha}</span></div>
                ${ev.candidato ? `<div class="info-row"><i data-lucide="user" class="w-4 h-4"></i><span>Candidato: ${ev.candidato}</span></div>` : ''}
                <p class="card-desc">${ev.descripcion}</p>
                <div class="card-actions"><i data-lucide="pencil" class="w-4 h-4 edit-ev" data-index="${index}" data-id="${ev.id || ''}"></i><i data-lucide="trash-2" class="w-4 h-4 delete-ev" data-index="${index}" data-id="${ev.id || ''}"></i></div>
            </div>
        `).join('');
        if (window.lucide) lucide.createIcons();
    };

    // Usar localStorage como respaldo, priorizando sincronización desde Supabase
    let eventosGuardados = JSON.parse(localStorage.getItem('eventos_riwicalls')) || [];
    let editandoEventoId = null;

    btnAbrirEv?.addEventListener('click', () => {
        editandoEventoId = null;
        cargarCandidatosDinamicos();
        resetFormularioEvento();
        if (modalEv) modalEv.style.display = 'flex';
    });
    btnCerrarEv?.addEventListener('click', () => {
        if (modalEv) modalEv.style.display = 'none';
        editandoEventoId = null;
    });

    const resetFormularioEvento = () => {
        document.getElementById('evNombre').value = '';
        document.getElementById('evTipo').value = '';
        document.getElementById('evEstado').value = '';
        document.getElementById('evFecha').value = '';
        document.getElementById('evCandidato').value = 'Ninguno';
        document.getElementById('evDescripcion').value = '';
    };

    btnGuardarEv?.addEventListener('click', async () => {
        try {
            const datosEvento = {
                tipo_reunion: document.getElementById('evNombre')?.value,
                descripcion: document.getElementById('evDescripcion')?.value,
                estado: document.getElementById('evEstado')?.value || 'Programado',
                fecha_hora: document.getElementById('evFecha')?.value || new Date().toISOString()
            };

            // Validar que al menos el título esté completo
            if (!datosEvento.tipo_reunion || datosEvento.tipo_reunion.trim() === '') {
                alert('Por favor ingresa un nombre para el evento.');
                return;
            }

            if (editandoEventoId) {
                // Actualizar en Supabase
                try {
                    await updateEventoInSupabase(editandoEventoId, datosEvento);
                } catch (err) {
                    console.warn('No se pudo actualizar evento en Supabase:', err);
                }

                // Actualizar en localStorage
                const idx = eventosGuardados.findIndex(e => e.id === editandoEventoId);
                if (idx >= 0) {
                    eventosGuardados[idx] = { ...eventosGuardados[idx], ...datosEvento, id: editandoEventoId };
                }
            } else {
                // Crear en Supabase
                try {
                    const eventoCreado = await createEventoInSupabase(datosEvento);
                    if (eventoCreado && eventoCreado.id) {
                        eventosGuardados.push({
                            id: eventoCreado.id,
                            titulo: datosEvento.tipo_reunion,
                            ...datosEvento
                        });
                    }
                } catch (err) {
                    console.warn('No se pudo crear evento en Supabase, guardando localmente:', err);
                    // Fallback: guardar solo en localStorage con ID temporal
                    const eventoLocal = {
                        id: `local_${Date.now()}`,
                        titulo: datosEvento.tipo_reunion,
                        tipo: document.getElementById('evTipo')?.value || '',
                        estado: datosEvento.estado,
                        fecha: datosEvento.fecha_hora,
                        candidato: document.getElementById('evCandidato')?.value || 'Ninguno',
                        descripcion: datosEvento.descripcion
                    };
                    eventosGuardados.push(eventoLocal);
                }
            }

            localStorage.setItem('eventos_riwicalls', JSON.stringify(eventosGuardados));
            renderizarCards(eventosGuardados);
            if (modalEv) modalEv.style.display = 'none';
            editandoEventoId = null;
        } catch (error) {
            alert('Error al guardar el evento: ' + error.message);
        }
    });

    // Delegación de eventos
    grid?.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-ev');
        const editBtn = e.target.closest('.edit-ev');

        if (deleteBtn) {
            const index = deleteBtn.getAttribute('data-index');
            const eventoId = deleteBtn.getAttribute('data-id');
            if (confirm('¿Seguro que quieres eliminar este evento?')) {
                try {
                    if (eventoId && !eventoId.startsWith('local_')) {
                        await deleteEventoInSupabase(eventoId);
                    }
                } catch (err) {
                    console.warn('No se pudo eliminar evento en Supabase:', err);
                }
                eventosGuardados.splice(index, 1);
                localStorage.setItem('eventos_riwicalls', JSON.stringify(eventosGuardados));
                renderizarCards(eventosGuardados);
            }
        }
        if (editBtn) {
            const index = editBtn.getAttribute('data-index');
            const eventoId = editBtn.getAttribute('data-id');
            const ev = eventosGuardados[index];
            editandoEventoId = eventoId;
            document.getElementById('evNombre').value = ev.titulo || ev.nombre || ev.tipo_reunion || '';
            document.getElementById('evTipo').value = ev.tipo || '';
            document.getElementById('evEstado').value = ev.estado || '';
            document.getElementById('evFecha').value = ev.fecha || ev.fecha_hora || '';
            document.getElementById('evDescripcion').value = ev.descripcion || '';
            cargarCandidatosDinamicos();
            document.getElementById('evCandidato').value = ev.candidato || 'Ninguno';
            if (modalEv) modalEv.style.display = 'flex';
        }
    });

    const cargarEventos = async () => {
        try {
            const eventosSupabase = await syncEventosFromSupabase();
            if (Array.isArray(eventosSupabase) && eventosSupabase.length) {
                eventosGuardados = eventosSupabase;
                localStorage.setItem('eventos_riwicalls', JSON.stringify(eventosGuardados));
            }
        } catch (error) {
            console.warn('No se pudieron cargar eventos desde Supabase:', error);
        }

        renderizarCards(eventosGuardados);
    };

    cargarEventos();
}
