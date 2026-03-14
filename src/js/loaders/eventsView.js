import template from '../../views/eventsView.html?raw';

export async function eventsView() {
    return {
        title: 'Sistema de Eventos',
        cssPath: 'src/css/eventos.css',
        template,
        logic: async () => {
            const mod = await import('../logic/events.js');
            if (mod && typeof mod.initEventsView === 'function') mod.initEventsView();
        }
    };
}
