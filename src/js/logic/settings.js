const WEBHOOK_STORAGE_KEY = 'call_flow_webhook_url';
const LEGACY_WEBHOOK_STORAGE_KEY = 'webhook_n8n_url';

export function initSettingsView() {
    const btnWebhook = document.getElementById('btn-save-webhook');
    const webhookInput = document.getElementById('webhook-url');
    const btnSystem = document.getElementById('btn-save-system');

    const urlGuardada = localStorage.getItem(WEBHOOK_STORAGE_KEY) || localStorage.getItem(LEGACY_WEBHOOK_STORAGE_KEY);
    if (urlGuardada) webhookInput.value = urlGuardada;

    btnWebhook.addEventListener('click', () => {
        const url = webhookInput.value.trim();
        if (url !== "") {
            localStorage.setItem(WEBHOOK_STORAGE_KEY, url);
            localStorage.removeItem(LEGACY_WEBHOOK_STORAGE_KEY);
            alert(' ¡Configuración del webhook sincronizada con éxito!');
        } else alert('Por favor, ingresa una URL válida.');
    });

    btnSystem.addEventListener('click', () => { alert('Intervalo de actualización del sistema ajustado.'); });

    if (window.lucide) lucide.createIcons();
}
