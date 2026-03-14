import { App } from '../app.js';
import { dashboardView } from '../loaders/dashboardView.js';
import { candidatesView } from '../loaders/candidatesView.js';
import { settingsView } from '../loaders/settingsView.js';
import { eventsView } from '../loaders/eventsView.js';
import { callsView } from '../loaders/callsView.js';
import { reportsView } from '../loaders/reportsView.js';
import { analyticsView } from '../loaders/analyticsView.js';
import { trackingView } from '../loaders/trackingView.js';

const routes = {
    '#/dashboard': dashboardView,
    '#/candidates': candidatesView,
    '#/analytics': analyticsView,
    '#/settings': settingsView,
    '#/events': eventsView,
    '#/calls': callsView,
    '#/reports': reportsView,
    '#/tracking': trackingView,
    // Legacy routes for backward compatibility
    '#/candidatos': candidatesView,
    '#/analitica': analyticsView,
    '#/configuracion': settingsView,
    '#/eventos': eventsView,
    '#/llamadas': callsView,
    '#/reportes': reportsView,
    '#/seguimiento': trackingView
};

export const initRouter = () => {
    const handleRoute = async () => {
        const hash = window.location.hash || '#/dashboard';
        let view = routes[hash] || { title: '404', template: '<div>Not Found</div>' };

        // Soportar vistas que sean funciones async (p.ej. loader que hace fetch de un .html)
        if (typeof view === 'function') {
            try { view = await view(); } catch (err) { console.error('Error cargando vista', err); view = { title: '500', template: '<div>Error</div>' }; }
        }

        App.render(view);
    };

    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('load', handleRoute);
};

export default routes;
