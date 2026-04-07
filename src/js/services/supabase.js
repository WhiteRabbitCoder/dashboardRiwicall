const EDGE_PROXY_URL = '/.netlify/edge-functions/supabase-proxy';
const LOCAL_DEV_PROXY_URL = '/__local/supabase-proxy';
const SUPABASE_URL_STORAGE_KEY = 'supabase_direct_url';
const LEGACY_SUPABASE_ANON_KEY_STORAGE_KEY = 'supabase_direct_anon_key';
const SUPABASE_URL_ENV = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY_ENV = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isRunningOnNetlify = () => window.location.hostname.endsWith('.netlify.app');
const isLocalDevHost = () => ['localhost', '127.0.0.1'].includes(window.location.hostname);
const isSecretKey = (value) => String(value || '').trim().startsWith('sb_secret_');

const buildLookupMap = (list = [], labelKey = 'descripcion') => {
    const map = new Map();
    (list || []).forEach((item) => {
        map.set(String(item.id), {
            ...item,
            label: item[labelKey] ?? item.descripcion ?? item.nombre ?? String(item.id)
        });
    });
    return map;
};

const calculateAge = (isoDate) => {
    if (!isoDate) return '';
    const fecha = new Date(isoDate);
    if (Number.isNaN(fecha.getTime())) return '';
    return Math.max(0, Math.floor((Date.now() - fecha.getTime()) / (1000 * 60 * 60 * 24 * 365.25)));
};

const normalizeSupabaseUrl = (value) => {
    if (!value) return '';

    try {
        const parsed = new URL(value);
        if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co')) {
            return '';
        }
        return parsed.toString().replace(/\/+$/, '');
    } catch (error) {
        return '';
    }
};

const getStoredConnection = () => ({
    supabaseUrl: normalizeSupabaseUrl(localStorage.getItem(SUPABASE_URL_STORAGE_KEY) || '')
});

export function configureSupabaseConnection({ supabaseUrl = '', supabaseAnonKey = '' } = {}) {
    const normalizedUrl = normalizeSupabaseUrl(supabaseUrl);

    if (normalizedUrl) {
        localStorage.setItem(SUPABASE_URL_STORAGE_KEY, normalizedUrl);
    }

    // Never persist keys client-side; keep them in .env or pass only at runtime.
    localStorage.removeItem(LEGACY_SUPABASE_ANON_KEY_STORAGE_KEY);
    void supabaseAnonKey;
}

export function getSupabaseConnectionConfig() {
    localStorage.removeItem(LEGACY_SUPABASE_ANON_KEY_STORAGE_KEY);

    const stored = getStoredConnection();
    const envUrl = normalizeSupabaseUrl(SUPABASE_URL_ENV);
    const envKey = SUPABASE_ANON_KEY_ENV.trim();
    return {
        // Prefer env over localStorage so local setup is reproducible and avoids stale browser data.
        supabaseUrl: envUrl || stored.supabaseUrl,
        supabaseAnonKey: envKey
    };
}

export async function syncCandidatosFromSupabase(options = {}) {
    const [
        candidatos,
        candidatoUbicacion,
        candidatoPerfil,
        candidatoGestion,
        candidatoFase,
        candidatoEvento,
        tiposDocumento,
        generos,
        tiposConvenio,
        departamentos,
        municipios,
        sedes,
        estratos,
        nivelesEducativos,
        conocimientosProgramacion,
        ocupaciones,
        horarios,
        mediosComunicacion,
        estadosGestion,
        eventos
    ] = await Promise.all([
        fetchSupabaseTable('candidatos', options),
        fetchSupabaseTable('candidato_ubicacion', options),
        fetchSupabaseTable('candidato_perfil', options),
        fetchSupabaseTable('candidato_gestion', options),
        fetchSupabaseTable('candidato_fase', options),
        fetchSupabaseTable('candidato_evento', options),
        fetchSupabaseTable('tipos_documento', options),
        fetchSupabaseTable('generos', options),
        fetchSupabaseTable('tipos_convenio', options),
        fetchSupabaseTable('departamentos', options),
        fetchSupabaseTable('municipios', options),
        fetchSupabaseTable('sedes', options),
        fetchSupabaseTable('estratos', options),
        fetchSupabaseTable('niveles_educativos', options),
        fetchSupabaseTable('conocimientos_programacion', options),
        fetchSupabaseTable('ocupaciones', options),
        fetchSupabaseTable('horarios', options),
        fetchSupabaseTable('medios_comunicacion', options),
        fetchSupabaseTable('estados_gestion', options),
        fetchSupabaseTable('eventos', options)
    ]);

    const tiposDocumentoMap = buildLookupMap(tiposDocumento);
    const generosMap = buildLookupMap(generos);
    const tiposConvenioMap = buildLookupMap(tiposConvenio);
    const departamentosMap = buildLookupMap(departamentos, 'nombre');
    const municipiosMap = buildLookupMap(municipios, 'nombre');
    const sedesMap = buildLookupMap(sedes, 'nombre');
    const estratosMap = buildLookupMap(estratos, 'valor');
    const nivelesMap = buildLookupMap(nivelesEducativos);
    const conocimientosMap = buildLookupMap(conocimientosProgramacion);
    const ocupacionesMap = buildLookupMap(ocupaciones);
    const horariosMap = buildLookupMap(horarios);
    const mediosMap = buildLookupMap(mediosComunicacion);
    const estadosMap = buildLookupMap(estadosGestion);
    const eventosMap = buildLookupMap(
        (eventos || []).map((evento) => ({
            ...evento,
            descripcion: `${evento.tipo_reunion || 'Evento'}${evento.fecha_hora ? ` - ${new Date(evento.fecha_hora).toLocaleString()}` : ''}`
        }))
    );

    const ubiMap = new Map((candidatoUbicacion || []).map(u => [String(u.candidato_id), u]));
    const perfilMap = new Map((candidatoPerfil || []).map(p => [String(p.candidato_id), p]));
    const gestionMap = new Map((candidatoGestion || []).map(g => [String(g.candidato_id), g]));
    const faseMap = new Map((candidatoFase || []).map(f => [String(f.candidato_id), f]));
    const evMap = new Map((candidatoEvento || []).map(e => [String(e.candidato_id), e]));

    return (candidatos || []).map((candidato) => {
        const ubi = ubiMap.get(String(candidato.id)) || {};
        const perfil = perfilMap.get(String(candidato.id)) || {};
        const gestion = gestionMap.get(String(candidato.id)) || {};
        const fase = faseMap.get(String(candidato.id)) || {};
        const candEv = evMap.get(String(candidato.id)) || {};

        const tipoDocumento = tiposDocumentoMap.get(String(candidato.tipo_documento_id));
        const genero = generosMap.get(String(candidato.genero_id));

        const convenio = tiposConvenioMap.get(String(perfil.tipo_convenio_id));
        const departamento = departamentosMap.get(String(ubi.departamento_id));
        const municipio = municipiosMap.get(String(ubi.municipio_id));
        const sede = sedesMap.get(String(ubi.sede_interes_id));
        const estrato = estratosMap.get(String(ubi.estrato_id));
        const nivelEducativo = nivelesMap.get(String(perfil.nivel_educativo_id));
        const nivelProg = conocimientosMap.get(String(perfil.conocimiento_prog_id));
        const ocupacion = ocupacionesMap.get(String(perfil.ocupacion_id));

        const medio = mediosMap.get(String(gestion.medio_comunicacion_id));
        const estadoGestion = estadosMap.get(String(gestion.estado_gestion_id));
        const eventoAsignado = eventosMap.get(String(candEv.evento_id));
        const edad = calculateAge(candidato.fecha_nacimiento);
        const nombreCompleto = [candidato.nombre, candidato.apellido].filter(Boolean).join(' ').trim() || 'Sin nombre';

        return {
            id: candidato.id,
            nombre: nombreCompleto,
            nombreCompleto,
            nombre_raw: candidato.nombre || '',
            apellido: candidato.apellido || '',
            tipo_documento_id: candidato.tipo_documento_id,
            tipo_documento: tipoDocumento?.label || '',
            numero_documento: candidato.numero_documento ? String(candidato.numero_documento) : '',
            cedula: candidato.numero_documento ? String(candidato.numero_documento) : '',
            documento: candidato.numero_documento ? String(candidato.numero_documento) : '',
            edad,
            genero: genero?.descripcion || 'Otro',
            genero_id: candidato.genero_id,
            tel: candidato.telefono || '',
            telefono: candidato.telefono || '',
            correo: candidato.correo || '',
            pais_codigo: candidato.pais_codigo || '+57',
            fecha_nacimiento: candidato.fecha_nacimiento || '',

            tipo_convenio_id: perfil.tipo_convenio_id,
            tipo_convenio: convenio?.label || '',
            departamento_id: ubi.departamento_id,
            departamento: departamento?.label || '',
            municipio_id: ubi.municipio_id,
            municipio: municipio?.nombre || '',
            sede_interes_id: ubi.sede_interes_id,
            sede_interes: sede?.label || '',
            estrato_id: ubi.estrato_id,
            estrato: estrato?.label ? String(estrato.label) : '',
            educacion: nivelEducativo?.descripcion || '',
            nivel_educativo_id: perfil.nivel_educativo_id,
            titulo: perfil.titulo || '',
            programacion: nivelProg?.descripcion || '',
            conocimiento_programacion_id: perfil.conocimiento_prog_id,
            ocupacion_id: perfil.ocupacion_id,
            ocupacion: ocupacion?.label || '',

            medio_comunicacion_id: gestion.medio_comunicacion_id,
            medio_comunicacion: medio?.label || '',
            estado_gestion_id: gestion.estado_gestion_id,
            estado_gestion: estadoGestion?.descripcion || '',

            // fallbacks for missing properties in the new schema:
            horario_id: null,
            jornada: '',
            motivo_llamada_id: null,
            motivo_llamada: '',

            estado: estadoGestion?.descripcion || fase.tipo_reunion_id ? `Fase ${fase.tipo_reunion_id}` : 'Inscrito',
            fase_actual: fase.tipo_reunion_id ? `Fase ${fase.tipo_reunion_id}` : '',
            evento_asignado_id: candEv.evento_id,
            evento_asignado: eventoAsignado?.label || '',
            intentos_llamada: gestion.intentos_llamada || 0,
            proxima_llamada: '', // Not in DB natively as string, requires parsed logic
            hora_preferida_llamada: gestion.hora_preferida || '',
            nota_horario: gestion.nota_horario || '',
            form_name: candidato.discord_usuario || '',
            form_id: ''
        };
    });
}

export async function getCandidatosCatalogos(options = {}) {
    const [
        tiposDocumento,
        generos,
        tiposConvenio,
        departamentos,
        municipios,
        sedes,
        estratos,
        horarios,
        mediosComunicacion,
        nivelesEducativos,
        conocimientosProgramacion,
        ocupaciones,
        estadosGestion,
        eventos
    ] = await Promise.all([
        fetchSupabaseTable('tipos_documento', options),
        fetchSupabaseTable('generos', options),
        fetchSupabaseTable('tipos_convenio', options),
        fetchSupabaseTable('departamentos', options),
        fetchSupabaseTable('municipios', options),
        fetchSupabaseTable('sedes', options),
        fetchSupabaseTable('estratos', options),
        fetchSupabaseTable('horarios', options),
        fetchSupabaseTable('medios_comunicacion', options),
        fetchSupabaseTable('niveles_educativos', options),
        fetchSupabaseTable('conocimientos_programacion', options),
        fetchSupabaseTable('ocupaciones', options),
        fetchSupabaseTable('estados_gestion', options),
        fetchSupabaseTable('eventos', options)
    ]);

    return {
        tiposDocumento,
        generos,
        tiposConvenio,
        departamentos,
        municipios,
        sedes,
        estratos,
        horarios,
        mediosComunicacion,
        nivelesEducativos,
        conocimientosProgramacion,
        ocupaciones,
        estadosGestion,
        eventos
    };
}

const readMutationFromEdgeProxy = async (table, { method = 'POST', query = '', body } = {}) => {
    const endpoint = new URL(EDGE_PROXY_URL, window.location.origin);
    endpoint.searchParams.set('table', table);
    if (query) {
        const raw = query.startsWith('?') ? query.slice(1) : query;
        const params = new URLSearchParams(raw);
        for (const [key, value] of params.entries()) {
            endpoint.searchParams.set(key, value);
        }
    }

    const response = await fetch(endpoint.toString(), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const detail = typeof data === 'object' && data !== null
            ? (data.error || data.message || JSON.stringify(data))
            : String(data || '');
        throw new Error(`Edge Function devolvio ${response.status}${detail ? `: ${detail}` : ''}`);
    }

    return data;
};

const mutateFromLocalDevProxy = async (table, { method = 'POST', query = '', body } = {}) => {
    const endpoint = new URL(LOCAL_DEV_PROXY_URL, window.location.origin);
    endpoint.searchParams.set('table', table);
    if (query) {
        const raw = query.startsWith('?') ? query.slice(1) : query;
        const params = new URLSearchParams(raw);
        for (const [key, value] of params.entries()) {
            endpoint.searchParams.set(key, value);
        }
    }

    const response = await fetch(endpoint.toString(), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const detail = typeof data === 'object' && data !== null
            ? (data.error || data.message || JSON.stringify(data))
            : String(data || '');
        throw new Error(`Proxy local devolvio ${response.status}${detail ? `: ${detail}` : ''}`);
    }

    return data;
};

const mutateDirectSupabase = async (
    table,
    { method = 'POST', query = '', body } = {},
    { supabaseUrl, supabaseAnonKey }
) => {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY para escritura directa.');
    }
    if (isSecretKey(supabaseAnonKey)) {
        throw new Error('La secret key no se puede usar directo en navegador.');
    }

    const endpoint = `${supabaseUrl}/rest/v1/${table}${query || ''}`;
    const response = await fetch(endpoint, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`
        },
        body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        const detail = typeof data === 'object' && data !== null
            ? (data.message || data.error || data.hint || JSON.stringify(data))
            : String(data || '');
        throw new Error(`Supabase REST devolvio ${response.status}${detail ? `: ${detail}` : ''}`);
    }

    return data;
};

async function mutateSupabaseTable(table, operation = {}, options = {}) {
    const config = getSupabaseConnectionConfig();
    const overrideUrl = normalizeSupabaseUrl(options.supabaseUrl || '');
    const overrideKey = String(options.supabaseAnonKey || '').trim();
    const supabaseUrl = overrideUrl || config.supabaseUrl;
    const supabaseAnonKey = overrideKey || config.supabaseAnonKey;
    const preferDirect = typeof options.preferDirect === 'boolean'
        ? options.preferDirect
        : !isRunningOnNetlify();

    const strategies = [];
    if (isLocalDevHost()) {
        strategies.push(() => mutateFromLocalDevProxy(table, operation));
        if (preferDirect) {
            strategies.push(() => mutateDirectSupabase(table, operation, { supabaseUrl, supabaseAnonKey }));
            strategies.push(() => readMutationFromEdgeProxy(table, operation));
        } else {
            strategies.push(() => readMutationFromEdgeProxy(table, operation));
            strategies.push(() => mutateDirectSupabase(table, operation, { supabaseUrl, supabaseAnonKey }));
        }
    } else if (preferDirect) {
        strategies.push(() => mutateDirectSupabase(table, operation, { supabaseUrl, supabaseAnonKey }));
        strategies.push(() => readMutationFromEdgeProxy(table, operation));
    } else {
        strategies.push(() => readMutationFromEdgeProxy(table, operation));
        strategies.push(() => mutateDirectSupabase(table, operation, { supabaseUrl, supabaseAnonKey }));
    }

    const errors = [];
    for (const strategy of strategies) {
        try {
            return await strategy();
        } catch (error) {
            errors.push(error?.message || String(error));
        }
    }

    throw new Error(`No fue posible escribir en ${table}. ${errors.join(' | ')}`);
}

export async function createCandidatoInSupabase(payload, options = {}) {
    const response = await mutateSupabaseTable('candidatos', {
        method: 'POST',
        query: '?select=*',
        body: payload
    }, options);
    return Array.isArray(response) ? response[0] : response;
}

export async function updateCandidatoInSupabase(id, payload, options = {}) {
    const response = await mutateSupabaseTable('candidatos', {
        method: 'PATCH',
        query: `?id=eq.${encodeURIComponent(id)}&select=*`,
        body: payload
    }, options);
    return Array.isArray(response) ? response[0] : response;
}

export async function deleteCandidatoInSupabase(id, options = {}) {
    await mutateSupabaseTable('candidatos', {
        method: 'DELETE',
        query: `?id=eq.${encodeURIComponent(id)}&select=id`
    }, options);
}

export async function syncLlamadasFromSupabase(options = {}) {
    const [llamadas, candidatos, resultados] = await Promise.all([
        fetchSupabaseTable('llamadas', options),
        fetchSupabaseTable('candidatos', options),
        fetchSupabaseTable('resultados_llamada', options)
    ]);

    const candidatosMap = new Map((candidatos || []).map(c => [String(c.id), c]));
    const resultadosMap = new Map((resultados || []).map(r => [String(r.id), r]));

    return (llamadas || []).map((llamada) => {
        const candidato = candidatosMap.get(String(llamada.candidato_id));
        const resultado = resultadosMap.get(String(llamada.resultado_id));
        const nombre = [candidato?.nombre, candidato?.apellido].filter(Boolean).join(' ').trim() || 'Sin nombre';
        return {
            id: llamada.id,
            nombre,
            tel: candidato?.telefono || '',
            estado: resultado?.descripcion || 'Pendiente',
            fechaLlamada: llamada.fecha_hora || llamada.created_at || '',
            motivo: llamada.nota || ''
        };
    });
}

export async function syncEventosFromSupabase(options = {}) {
    const [eventos, horarios, candidatos] = await Promise.all([
        fetchSupabaseTable('eventos', options),
        fetchSupabaseTable('horarios', options),
        fetchSupabaseTable('candidatos', options)
    ]);

    const horariosMap = new Map((horarios || []).map(h => [String(h.id), h]));
    const candidatosPorEvento = new Map();

    (candidatos || []).forEach((candidato) => {
        if (candidato.evento_asignado_id) {
            const eventoId = String(candidato.evento_asignado_id);
            const nombre = [candidato.nombre, candidato.apellido].filter(Boolean).join(' ').trim();
            const actuales = candidatosPorEvento.get(eventoId) || [];
            candidatosPorEvento.set(eventoId, [...actuales, nombre].filter(Boolean));
        }
    });

    return (eventos || []).map((evento) => {
        const horario = horariosMap.get(String(evento.horario_id));
        return {
            id: evento.id,
            titulo: evento.tipo_reunion || 'Evento',
            tipo: horario?.descripcion || 'Programación',
            estado: evento.estado || 'Programado',
            fecha: evento.fecha_hora || '',
            candidato: (candidatosPorEvento.get(String(evento.id)) || []).join(', ') || 'Ninguno',
            descripcion: evento.descripcion || ''
        };
    });
}

const readFromEdgeProxy = async (table) => {
    const endpoint = new URL(EDGE_PROXY_URL, window.location.origin);
    endpoint.searchParams.set('table', table);

    const response = await fetch(endpoint.toString());
    if (!response.ok) {
        throw new Error(`Edge Function devolvió ${response.status}`);
    }

    const data = await response.json().catch(() => {
        throw new Error('Edge devolvió contenido no JSON.');
    });
    return Array.isArray(data) ? data : [];
};

const readFromLocalDevProxy = async (table) => {
    const endpoint = new URL(LOCAL_DEV_PROXY_URL, window.location.origin);
    endpoint.searchParams.set('table', table);

    const response = await fetch(endpoint.toString());
    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const detail = typeof data === 'object' && data !== null
            ? (data.error || data.message || JSON.stringify(data))
            : String(data || '');
        throw new Error(`Proxy local devolvió ${response.status}${detail ? `: ${detail}` : ''}`);
    }

    return Array.isArray(data) ? data : [];
};

const readDirectFromSupabase = async (table, supabaseUrl, supabaseAnonKey) => {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY para conexión directa.');
    }
    if (isSecretKey(supabaseAnonKey)) {
        throw new Error('La secret key no se puede usar directo en navegador. Usa proxy local o Edge Function.');
    }

    const endpoint = `${supabaseUrl}/rest/v1/${table}?select=*`;
    const response = await fetch(endpoint, {
        headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`
        }
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        const detail = typeof data === 'object' && data !== null
            ? (data.message || data.error || data.hint || JSON.stringify(data))
            : String(data || '');
        throw new Error(`Supabase REST devolvió ${response.status}${detail ? `: ${detail}` : ''}`);
    }

    return Array.isArray(data) ? data : [];
};

export async function fetchSupabaseTable(table, options = {}) {
    const config = getSupabaseConnectionConfig();
    const overrideUrl = normalizeSupabaseUrl(options.supabaseUrl || '');
    const overrideKey = String(options.supabaseAnonKey || '').trim();
    const supabaseUrl = overrideUrl || config.supabaseUrl;
    const supabaseAnonKey = overrideKey || config.supabaseAnonKey;
    const preferDirect = typeof options.preferDirect === 'boolean'
        ? options.preferDirect
        : !isRunningOnNetlify();

    const strategies = [];
    if (isLocalDevHost()) {
        strategies.push(() => readFromLocalDevProxy(table));
        strategies.push(() => readFromEdgeProxy(table));
        if (!isSecretKey(supabaseAnonKey)) {
            strategies.push(() => readDirectFromSupabase(table, supabaseUrl, supabaseAnonKey));
        }
    } else if (preferDirect) {
        strategies.push(() => readDirectFromSupabase(table, supabaseUrl, supabaseAnonKey));
        strategies.push(() => readFromEdgeProxy(table));
    } else {
        strategies.push(() => readFromEdgeProxy(table));
        strategies.push(() => readDirectFromSupabase(table, supabaseUrl, supabaseAnonKey));
    }

    const errors = [];
    for (const strategy of strategies) {
        try {
            return await strategy();
        } catch (error) {
            errors.push(error?.message || String(error));
        }
    }

    throw new Error(`No fue posible sincronizar ${table}. ${errors.join(' | ')}`);
}

export async function createEventoInSupabase(payload, options = {}) {
    const response = await mutateSupabaseTable('eventos', {
        method: 'POST',
        query: '?select=*',
        body: payload
    }, options);
    return Array.isArray(response) ? response[0] : response;
}

export async function updateEventoInSupabase(id, payload, options = {}) {
    const response = await mutateSupabaseTable('eventos', {
        method: 'PATCH',
        query: `?id=eq.${encodeURIComponent(id)}&select=*`,
        body: payload
    }, options);
    return Array.isArray(response) ? response[0] : response;
}

export async function deleteEventoInSupabase(id, options = {}) {
    await mutateSupabaseTable('eventos', {
        method: 'DELETE',
        query: `?id=eq.${encodeURIComponent(id)}&select=id`
    }, options);
}
