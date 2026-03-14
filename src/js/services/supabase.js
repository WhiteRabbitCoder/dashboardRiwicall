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

export async function syncCandidatosFromSupabase() {
    const edgeUrl = getNetlifyEdgeUrl();
    const supabaseUrl = getSupabaseUrl();
    const endpoint = new URL(edgeUrl, window.location.origin);

    if (supabaseUrl) endpoint.searchParams.set('supabaseUrl', supabaseUrl);
    endpoint.searchParams.set('table', 'candidatos');

    const response = await fetch(endpoint.toString());
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'No fue posible sincronizar desde Supabase');
    }

    return response.json();
}
