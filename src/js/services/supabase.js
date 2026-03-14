const STORAGE_KEYS = {
    supabaseUrl: 'supabase_url',
    netlifyEdgeUrl: 'netlify_edge_supabase_url'
};

const DEFAULT_EDGE_URL = '/.netlify/edge-functions/supabase-proxy';

export function getSupabaseUrl() {
    return localStorage.getItem(STORAGE_KEYS.supabaseUrl) || '';
}

export function saveSupabaseUrl(url) {
    localStorage.setItem(STORAGE_KEYS.supabaseUrl, url.trim());
}

export function getNetlifyEdgeUrl() {
    return localStorage.getItem(STORAGE_KEYS.netlifyEdgeUrl) || DEFAULT_EDGE_URL;
}

export function saveNetlifyEdgeUrl(url) {
    const finalUrl = url.trim() || DEFAULT_EDGE_URL;
    localStorage.setItem(STORAGE_KEYS.netlifyEdgeUrl, finalUrl);
}

export function isSupabaseProjectUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
    } catch (error) {
        return false;
    }
}

export async function syncCandidatosFromSupabase() {
    const edgeUrl = getNetlifyEdgeUrl();
    const supabaseUrl = getSupabaseUrl();
    const endpoint = new URL(edgeUrl, window.location.origin);

    if (supabaseUrl) endpoint.searchParams.set('supabaseUrl', supabaseUrl);
    endpoint.searchParams.set('table', 'candidatos');

    try {
        const response = await fetch(endpoint.toString());
        if (!response.ok) {
            let message = 'No fue posible sincronizar desde Supabase';
            try {
                const errorPayload = await response.json();
                message = errorPayload?.error || errorPayload?.detail || message;
            } catch (error) {
                const fallbackText = await response.text();
                message = fallbackText || message;
            }
            throw new Error(message);
        }

        return response.json();
    } catch (error) {
        const detail = error?.message || String(error);
        throw new Error(detail || 'No se pudo conectar con la Edge Function de Netlify');
    }
}
