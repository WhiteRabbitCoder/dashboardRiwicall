import template from '../../views/callsView.html?raw';

export async function callsView() {
    return {
        title: 'Gestión de Llamadas',
        cssPath: 'src/css/llamadas.css',
        template,
        logic: async () => {
            const mod = await import('../logic/calls.js');
            if (mod && typeof mod.initCallsView === 'function') await mod.initCallsView();
        }
    };
}
