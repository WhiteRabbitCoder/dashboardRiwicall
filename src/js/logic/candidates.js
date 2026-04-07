import {
    createCandidatoInSupabase,
    deleteCandidatoInSupabase,
    getCandidatosCatalogos,
    syncCandidatosFromSupabase,
    updateCandidatoInSupabase
} from '../services/supabase.js';

const CALL_CANDIDATE_ENDPOINT = '/api/calls/candidate';

const toIntOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isInteger(n) ? n : null;
};

const sanitize = (value) => String(value || '').trim();

const normalizeCountryCode = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    return digits ? `+${digits}` : '+57';
};

const buildPhoneWithCountryCode = (phoneValue, countryCodeValue) => {
    const countryCode = normalizeCountryCode(countryCodeValue);
    const countryDigits = countryCode.slice(1);
    let phoneDigits = String(phoneValue || '').replace(/\D/g, '');

    if (!phoneDigits) return '';

    // Evita duplicar prefijo si el usuario ya lo incluyo.
    if (phoneDigits.startsWith(countryDigits)) {
        phoneDigits = phoneDigits.slice(countryDigits.length);
    }

    return phoneDigits ? `${countryCode}${phoneDigits}` : '';
};

const stripCountryCodeFromPhone = (phoneValue, countryCodeValue) => {
    const countryDigits = normalizeCountryCode(countryCodeValue).slice(1);
    const digits = String(phoneValue || '').replace(/\D/g, '');
    if (!digits) return '';
    return digits.startsWith(countryDigits) ? digits.slice(countryDigits.length) : digits;
};

const setOptions = (select, list, {
    emptyLabel = '',
    emptyValue = ''
} = {}) => {
    if (!select) return;
    const options = [];
    if (emptyLabel) options.push(`<option value="${emptyValue}">${emptyLabel}</option>`);
    options.push(...(list || []).map((item) => {
        const label = item.descripcion ?? item.nombre ?? item.valor ?? item.codigo ?? item.id;
        return `<option value="${item.id}">${label}</option>`;
    }));
    select.innerHTML = options.join('');
};

// ...existing code... (removed unused calculateAge)

export function initCandidatesView() {
    const inputBusqueda = document.getElementById('searchInput');
    const filtroEstado = document.getElementById('filtroEstado');
    const filtroEvento = document.getElementById('filtroEvento');
    const tbody = document.getElementById('cuerpoTabla');
    const modal = document.getElementById('modalRegistro');
    const tituloModal = document.querySelector('#modalRegistro h2');
    const btnGuardar = document.getElementById('btnGuardar');

    if (!tbody || !modal || !btnGuardar) return;

    let listaOriginal = [];
    let editandoId = null;
    let catalogos = {
        tiposDocumento: [],
        generos: [],
        tiposConvenio: [],
        departamentos: [],
        municipios: [],
        sedes: [],
        estratos: [],
        horarios: [],
        mediosComunicacion: [],
        nivelesEducativos: [],
        conocimientosProgramacion: [],
        ocupaciones: [],
        motivosLlamada: [],
        estadosGestion: [],
        eventos: []
    };

    const obtenerCandidato = (id) => listaOriginal.find((c) => String(c.id) === String(id));

    const renderTabla = (datos) => {
        tbody.innerHTML = (datos || []).map((candidato) => `
            <tr class="hover:bg-slate-50/50 transition-colors text-sm">
                <td class="px-6 py-4 font-bold text-slate-700">${candidato.nombre || '-'}</td>
                <td class="px-6 py-4 text-slate-500">${candidato.tipo_documento || '-'}</td>
                <td class="px-6 py-4 text-slate-500">${candidato.numero_documento || candidato.cedula || '-'}</td>
                <td class="px-6 py-4 text-slate-500">${candidato.edad || '-'}</td>
                <td class="px-6 py-4 text-slate-500">${candidato.telefono || candidato.tel || '-'}</td>
                <td class="px-6 py-4"><span class="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[11px] font-bold">${candidato.estado_gestion || candidato.estado || '-'}</span></td>
                <td class="px-6 py-4 text-slate-500">${candidato.evento_asignado || 'Sin evento'}</td>
                <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center gap-3">
                        <button class="btn-editar text-blue-500 hover:text-blue-700 transition-colors" title="Editar candidato" data-id="${candidato.id || ''}"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                        <button class="btn-llamar text-emerald-500 hover:text-emerald-700 transition-colors" title="Llamar candidato" data-id="${candidato.id || ''}"><i data-lucide="phone-call" class="w-4 h-4"></i></button>
                        <button class="btn-eliminar text-red-500 hover:text-red-700 transition-colors" title="Eliminar candidato" data-id="${candidato.id || ''}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
        if (window.lucide) window.lucide.createIcons();
    };

    const filtrar = () => {
        const texto = sanitize(inputBusqueda?.value).toLowerCase();
        const estado = filtroEstado?.value || 'Todos';
        const evento = filtroEvento?.value || 'Todos';

        const datos = listaOriginal.filter((candidato) => {
            const searchable = [
                candidato.nombre,
                candidato.numero_documento,
                candidato.cedula,
                candidato.telefono,
                candidato.tel,
                candidato.correo
            ].join(' ').toLowerCase();
            const matchBusqueda = !texto || searchable.includes(texto);

            // Comparar tanto por id como por descripción/etiqueta, para soportar catálogos vacíos
            const matchEstado = estado === 'Todos'
                || String(candidato.estado_gestion_id) === estado
                || String(candidato.estado_gestion) === estado
                || String(candidato.estado) === estado;

            const matchEvento = evento === 'Todos'
                || (evento === 'SIN_EVENTO' && !candidato.evento_asignado_id)
                || String(candidato.evento_asignado_id) === evento
                || String(candidato.evento_asignado) === evento;

            return matchBusqueda && matchEstado && matchEvento;
        });

        renderTabla(datos);
    };

    const setMunicipiosPorDepartamento = (departamentoId, municipioSeleccionado = '') => {
        const selectMunicipio = document.getElementById('regMunicipio');
        const municipiosFiltrados = catalogos.municipios
            .filter((m) => String(m.departamento_id) === String(departamentoId));
        setOptions(selectMunicipio, municipiosFiltrados);
        if (municipioSeleccionado) {
            selectMunicipio.value = String(municipioSeleccionado);
        }
    };

    const poblarSelectsFormulario = () => {
        setOptions(document.getElementById('regTipoDocumento'), catalogos.tiposDocumento);
        setOptions(document.getElementById('regGenero'), catalogos.generos);
        setOptions(document.getElementById('regTipoConvenio'), catalogos.tiposConvenio);
        setOptions(document.getElementById('regDepartamento'), catalogos.departamentos);
        setOptions(document.getElementById('regSedeInteres'), catalogos.sedes);
        setOptions(document.getElementById('regEstrato'), catalogos.estratos);
        setOptions(document.getElementById('regHorario'), catalogos.horarios);
        setOptions(document.getElementById('regMedioComunicacion'), catalogos.mediosComunicacion);
        setOptions(document.getElementById('regNivelEducativo'), catalogos.nivelesEducativos, { emptyLabel: 'Sin definir' });
        setOptions(document.getElementById('regConocimientoProgramacion'), catalogos.conocimientosProgramacion, { emptyLabel: 'Sin definir' });
        setOptions(document.getElementById('regOcupacion'), catalogos.ocupaciones, { emptyLabel: 'Sin definir' });
        setOptions(document.getElementById('regEstadoGestion'), catalogos.estadosGestion);
        setOptions(document.getElementById('regEventoAsignado'), catalogos.eventos, { emptyLabel: 'Sin evento' });

        const selectDepartamento = document.getElementById('regDepartamento');
        if (selectDepartamento) {
            const firstDepartamento = selectDepartamento.value;
            setMunicipiosPorDepartamento(firstDepartamento);
            selectDepartamento.onchange = () => setMunicipiosPorDepartamento(selectDepartamento.value);
        }
    };

    const poblarFiltros = () => {
        setOptions(filtroEstado, catalogos.estadosGestion, { emptyLabel: 'Estado: Todos', emptyValue: 'Todos' });
        setOptions(filtroEvento, catalogos.eventos, { emptyLabel: 'Evento: Todos', emptyValue: 'Todos' });
        filtroEvento.insertAdjacentHTML('beforeend', '<option value="SIN_EVENTO">Sin evento</option>');
    };

    // Fallback: si no hay catálogos desde Supabase, construir opciones desde los datos locales
    const poblarFiltrosDesdeLocal = () => {
        const estadosMap = new Map();
        const eventosMap = new Map();

        (listaOriginal || []).forEach((c) => {
            const estId = c.estado_gestion_id ? String(c.estado_gestion_id) : (c.estado_gestion ? c.estado_gestion : null);
            const estLabel = c.estado_gestion || c.estado || estId;
            if (estId) estadosMap.set(estId, estLabel);

            const evId = c.evento_asignado_id ? String(c.evento_asignado_id) : (c.evento_asignado ? c.evento_asignado : null);
            const evLabel = c.evento_asignado || evId;
            if (evId) eventosMap.set(evId, evLabel);
        });

        const estados = Array.from(estadosMap.entries()).map(([id, descripcion]) => ({ id, descripcion }));
        const eventos = Array.from(eventosMap.entries()).map(([id, descripcion]) => ({ id, descripcion }));

        setOptions(filtroEstado, estados, { emptyLabel: 'Estado: Todos', emptyValue: 'Todos' });
        setOptions(filtroEvento, eventos, { emptyLabel: 'Evento: Todos', emptyValue: 'Todos' });
        filtroEvento.insertAdjacentHTML('beforeend', '<option value="SIN_EVENTO">Sin evento</option>');
    };

    const resetFormulario = () => {
        const formFields = [
            'regNombre', 'regApellido', 'regCorreo', 'regContrasenaHash', 'regTelefono', 'regPaisCodigo',
            'regFechaNacimiento', 'regNumeroDocumento', 'regTitulo', 'regDiscordUsuario', 'regFormName', 'regFormId'
        ];
        formFields.forEach((id) => {
            const element = document.getElementById(id);
            if (!element) return;
            element.value = element.defaultValue || '';
        });

        document.querySelectorAll('#modalRegistro select').forEach((select) => {
            if (select.options.length) select.value = select.options[0].value;
        });

        const selectDepartamento = document.getElementById('regDepartamento');
        if (selectDepartamento) {
            setMunicipiosPorDepartamento(selectDepartamento.value);
        }
    };

    const abrirModal = (candidato = null) => {
        editandoId = candidato?.id || null;
        if (tituloModal) tituloModal.textContent = editandoId ? 'Editar Candidato' : 'Nuevo Candidato';
        btnGuardar.textContent = editandoId ? 'Guardar Cambios' : 'Crear Candidato';

        resetFormulario();
        if (candidato) {
            document.getElementById('regNombre').value = candidato.nombre_raw || candidato.nombre?.split(' ')[0] || '';
            document.getElementById('regApellido').value = candidato.apellido || candidato.nombre?.split(' ').slice(1).join(' ') || '';
            document.getElementById('regCorreo').value = candidato.correo || '';
            document.getElementById('regContrasenaHash').value = candidato.contrasena_hash || 'hash_prueba_ui';
            const paisCodigo = candidato.pais_codigo || '+57';
            document.getElementById('regPaisCodigo').value = paisCodigo;
            document.getElementById('regTelefono').value = stripCountryCodeFromPhone(candidato.telefono || candidato.tel || '', paisCodigo);
            document.getElementById('regFechaNacimiento').value = candidato.fecha_nacimiento || '';
            document.getElementById('regNumeroDocumento').value = candidato.numero_documento || candidato.cedula || '';
            document.getElementById('regTitulo').value = candidato.titulo || '';
            document.getElementById('regDiscordUsuario').value = candidato.discord_usuario || '';
            document.getElementById('regFormName').value = candidato.form_name || 'Form Coders Test';
            document.getElementById('regFormId').value = candidato.form_id || '';

            const setSelectValue = (id, value) => {
                const select = document.getElementById(id);
                if (select && value !== null && value !== undefined) select.value = String(value);
            };

            setSelectValue('regTipoDocumento', candidato.tipo_documento_id);
            setSelectValue('regGenero', candidato.genero_id);
            setSelectValue('regTipoConvenio', candidato.tipo_convenio_id);
            setSelectValue('regDepartamento', candidato.departamento_id);
            setMunicipiosPorDepartamento(candidato.departamento_id, candidato.municipio_id);
            setSelectValue('regSedeInteres', candidato.sede_interes_id);
            setSelectValue('regEstrato', candidato.estrato_id);
            setSelectValue('regHorario', candidato.horario_id);
            setSelectValue('regMedioComunicacion', candidato.medio_comunicacion_id);
            setSelectValue('regNivelEducativo', candidato.nivel_educativo_id);
            setSelectValue('regConocimientoProgramacion', candidato.conocimiento_programacion_id);
            setSelectValue('regOcupacion', candidato.ocupacion_id);
            setSelectValue('regEstadoGestion', candidato.estado_gestion_id);
            setSelectValue('regEventoAsignado', candidato.evento_asignado_id || '');
            setSelectValue('regFaseActual', candidato.fase_actual || 'PRUEBA_LOGICA');
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };

    const cerrarModal = () => {
        editandoId = null;
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    };

    const construirPayload = () => {
        const paisCodigo = normalizeCountryCode(document.getElementById('regPaisCodigo')?.value);
        const telefonoConcatenado = buildPhoneWithCountryCode(document.getElementById('regTelefono')?.value, paisCodigo);

        // Payload para la tabla candidatos (campos principales)
        const candidatoPayload = {
            nombre: sanitize(document.getElementById('regNombre')?.value),
            apellido: sanitize(document.getElementById('regApellido')?.value),
            correo: sanitize(document.getElementById('regCorreo')?.value),
            telefono: telefonoConcatenado,
            pais_codigo: paisCodigo,
            fecha_nacimiento: sanitize(document.getElementById('regFechaNacimiento')?.value),
            tipo_documento_id: toIntOrNull(document.getElementById('regTipoDocumento')?.value),
            numero_documento: sanitize(document.getElementById('regNumeroDocumento')?.value),
            genero_id: toIntOrNull(document.getElementById('regGenero')?.value),
            discord_usuario: sanitize(document.getElementById('regDiscordUsuario')?.value) || null
        };

        // Payload para candidato_perfil
        const perfilPayload = {
            tipo_convenio_id: toIntOrNull(document.getElementById('regTipoConvenio')?.value),
            nivel_educativo_id: toIntOrNull(document.getElementById('regNivelEducativo')?.value),
            titulo: sanitize(document.getElementById('regTitulo')?.value) || null,
            conocimiento_prog_id: toIntOrNull(document.getElementById('regConocimientoProgramacion')?.value),
            ocupacion_id: toIntOrNull(document.getElementById('regOcupacion')?.value)
        };

        // Payload para candidato_ubicacion
        const ubicacionPayload = {
            departamento_id: toIntOrNull(document.getElementById('regDepartamento')?.value),
            municipio_id: toIntOrNull(document.getElementById('regMunicipio')?.value),
            sede_interes_id: toIntOrNull(document.getElementById('regSedeInteres')?.value),
            estrato_id: toIntOrNull(document.getElementById('regEstrato')?.value)
        };

        // Payload para candidato_gestion
        const gestionPayload = {
            estado_gestion_id: toIntOrNull(document.getElementById('regEstadoGestion')?.value),
            medio_comunicacion_id: toIntOrNull(document.getElementById('regMedioComunicacion')?.value),
            hora_preferida: sanitize(document.getElementById('regHorario')?.value) || null
        };

        const required = [
            'nombre', 'apellido', 'correo', 'telefono', 'fecha_nacimiento', 'numero_documento'
        ];
        const missingString = required.filter((key) => !candidatoPayload[key]);

        const requiredIds = [
            'tipo_documento_id', 'genero_id', 'tipo_convenio_id',
            'departamento_id', 'municipio_id', 'sede_interes_id', 'estrato_id',
            'estado_gestion_id'
        ];
        const requiredFields = {
            ...candidatoPayload, ...perfilPayload, ...ubicacionPayload, ...gestionPayload
        };
        const missingIds = requiredIds.filter((key) => !requiredFields[key]);

        if (missingString.length || missingIds.length) {
            throw new Error('Completa todos los campos obligatorios del candidato.');
        }

        return {
            candidato: candidatoPayload,
            perfil: perfilPayload,
            ubicacion: ubicacionPayload,
            gestion: gestionPayload
        };
    };

    const recargarDesdeSupabase = async () => {
        const [candidatos, nuevosCatalogos] = await Promise.all([
            syncCandidatosFromSupabase(),
            getCandidatosCatalogos()
        ]);

        if (Array.isArray(candidatos)) {
            listaOriginal = candidatos;
        }

        if (nuevosCatalogos) {
            catalogos = nuevosCatalogos;
            poblarSelectsFormulario();
            poblarFiltros();
        }

        filtrar();
    };

    inputBusqueda?.addEventListener('input', filtrar);
    filtroEstado?.addEventListener('change', filtrar);
    filtroEvento?.addEventListener('change', filtrar);

    document.getElementById('btnNuevoCandidato')?.addEventListener('click', () => abrirModal());

    const btnLlamarTodos = document.getElementById('btnLlamarTodos');
    if (btnLlamarTodos && !btnLlamarTodos.dataset.listening) {
        btnLlamarTodos.dataset.listening = 'true';
        btnLlamarTodos.addEventListener('click', async () => {
            if (!confirm(`¿Estás seguro de que deseas iniciar el proceso de llamadas masivas para la franja 'mañana'?`)) return;

            const btn = btnLlamarTodos;
            btn.disabled = true;
            const originalText = btn.innerHTML;
            btn.innerHTML = `<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Iniciando...`;
            if (window.lucide) window.lucide.createIcons();

            try {
                const response = await fetch('/api/admin/run-now', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ "forceMove": true, "franja": "manana", "limit": 1000 })
                });

                if (!response.ok) {
                    const detail = await response.text();
                    throw new Error(`Error ${response.status}: ${detail || 'No se pudo iniciar la campaña.'}`);
                }

                const result = await response.json();
                console.info('Resultado llamada masiva:', result);
                alert(`Proceso de llamadas masivas iniciado correctamente.\nRespuesta del servidor: ${JSON.stringify(result)}`);

            } catch (error) {
                alert('Error al iniciar llamadas masivas: ' + error.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
                if (window.lucide) window.lucide.createIcons();
            }
        });
    }

    document.getElementById('btnCancelar')?.addEventListener('click', cerrarModal);
    document.getElementById('btnCerrarX')?.addEventListener('click', cerrarModal);

    btnGuardar.addEventListener('click', async () => {
        btnGuardar.disabled = true;
        try {
            let payloadCompleto;
            try {
                payloadCompleto = construirPayload();
            } catch (validationError) {
                // Re-lanzar el error de validación para que sea capturado en el catch externo
                throw validationError;
            }

            // Solo enviamos el payload de candidato a Supabase (las relaciones las maneja el backend)
            const payload = payloadCompleto.candidato;

            if (editandoId) {
                await updateCandidatoInSupabase(editandoId, payload);
                alert('Candidato actualizado correctamente.');
            } else {
                await createCandidatoInSupabase(payload);
                alert('Candidato creado correctamente.');
            }
            await recargarDesdeSupabase();
            cerrarModal();
        } catch (error) {
            let msg = error?.message || 'No fue posible guardar el candidato.';
            if (msg.includes('candidatos_correo_key')) {
                msg = 'El correo electrónico ingresado ya pertenece a otro candidato. Por favor utiliza uno diferente.';
            } else if (msg.includes('candidatos_numero_documento_key')) {
                msg = 'El número de documento ingresado ya está registrado para otro candidato.';
            }
            alert(msg);
        } finally {
            btnGuardar.disabled = false;
        }
    });

    tbody.addEventListener('click', async (event) => {
        const btnEditar = event.target.closest('.btn-editar');
        const btnLlamar = event.target.closest('.btn-llamar');
        const btnEliminar = event.target.closest('.btn-eliminar');
        const id = btnEditar?.dataset.id || btnLlamar?.dataset.id || btnEliminar?.dataset.id;
        const candidato = obtenerCandidato(id);

        if (btnEditar) {
            if (!candidato) return alert('No se encontro el candidato seleccionado.');
            return abrirModal(candidato);
        }

        if (btnLlamar) {
            if (!candidato?.id) return alert('Este candidato no tiene ID de base de datos para llamar.');
            try {
                const response = await fetch(CALL_CANDIDATE_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ candidato_id: candidato.id, force: true })
                });
                if (!response.ok) {
                    const detail = await response.text();
                    throw new Error(`Error ${response.status}: ${detail || 'No se pudo iniciar la llamada.'}`);
                }
                alert(`Llamada disparada para ${candidato.nombre}.`);
            } catch (error) {
                alert(error?.message || 'No fue posible llamar al candidato.');
            }
            return;
        }

        if (btnEliminar) {
            if (!candidato?.id) return alert('No se puede eliminar: el candidato no tiene ID de base de datos.');
            if (!confirm(`¿Seguro que deseas eliminar a ${candidato.nombre}?`)) return;

            try {
                await deleteCandidatoInSupabase(candidato.id);
                await recargarDesdeSupabase();
                alert('Candidato eliminado correctamente.');
            } catch (error) {
                alert(error?.message || 'No fue posible eliminar el candidato.');
            }
        }
    });

    filtrar();

    recargarDesdeSupabase().catch((error) => {
        console.warn('No fue posible sincronizar candidatos desde Supabase:', error);
        try { poblarFiltrosDesdeLocal(); } catch (e) { /* ignore */ }
        alert('No se pudo sincronizar con Supabase.');
    });
}
