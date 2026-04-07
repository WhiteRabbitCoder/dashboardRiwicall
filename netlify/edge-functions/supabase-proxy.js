const SUPABASE_URL = Netlify.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY');

const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
});

const ALLOWED_TABLES = new Set([
    'candidato_evento',
    'candidato_fase',
    'candidato_gestion',
    'candidato_ideal',
    'candidato_perfil',
    'candidato_ubicacion',
    'candidatos',
    'cola_llamadas',
    'conocimientos_programacion',
    'departamentos',
    'estados_gestion',
    'estratos',
    'eventos',
    'generos',
    'historial_fases',
    'horarios',
    'llamadas',
    'medios_comunicacion',
    'municipios',
    'niveles_educativos',
    'ocupaciones',
    'resultados_llamada',
    'sedes',
    'tipos_convenio',
    'tipos_documento',
    'tipos_reunion'
]);

const isValidSupabaseUrl = (value) => {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
    } catch (error) {
        return false;
    }
};

export default async (request) => {
    const requestUrl = new URL(request.url);
    const table = requestUrl.searchParams.get('table') || 'candidatos';
    const method = request.method.toUpperCase();

    if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(method)) {
        return json({ error: 'Metodo no permitido.' }, 405);
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(table)) {
        return json({ error: 'Nombre de tabla inválido.' }, 400);
    }
    if (!ALLOWED_TABLES.has(table)) {
        return json({ error: 'La tabla solicitada no está permitida.' }, 403);
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
        return json({
            error: 'Faltan variables de entorno de Supabase en Netlify.'
        }, 400);
    }
    if (!isValidSupabaseUrl(SUPABASE_URL)) {
        return json({
            error: 'La URL de Supabase no es válida. Debe ser https://*.supabase.co'
        }, 400);
    }

    const baseUrl = SUPABASE_URL.endsWith('/') ? SUPABASE_URL.slice(0, -1) : SUPABASE_URL;
    const proxiedParams = new URLSearchParams(requestUrl.searchParams);
    proxiedParams.delete('table');

    if (!proxiedParams.has('select')) {
        proxiedParams.set('select', '*');
    }

    const queryString = proxiedParams.toString();
    const supabaseEndpoint = `${baseUrl}/rest/v1/${table}${queryString ? `?${queryString}` : ''}`;
    const headers = { 'Content-Type': 'application/json' };

    headers.apikey = SUPABASE_SERVICE_ROLE;
    headers.Authorization = `Bearer ${SUPABASE_SERVICE_ROLE}`;

    try {
        const fetchOptions = { method, headers };

        if (method !== 'GET' && method !== 'HEAD') {
            const rawBody = await request.text();
            if (rawBody) {
                fetchOptions.body = rawBody;
            }
            headers.Prefer = 'return=representation';
        }

        const response = await fetch(supabaseEndpoint, fetchOptions);
        const data = await response.json();

        if (!response.ok) {
            return json({
                error: 'Supabase devolvió un error.',
                detail: data
            }, response.status);
        }

        return json(data);
    } catch (error) {
        return json({
            error: 'No fue posible conectar con Supabase desde Netlify Edge Function.',
            detail: String(error?.message || error)
        }, 502);
    }
};
