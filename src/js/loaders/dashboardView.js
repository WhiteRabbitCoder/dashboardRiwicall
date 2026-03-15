import template from '../../views/dashboardView.html?raw';

export async function dashboardView() {
    return {
        title: 'Dashboard RiwiCalls',
        cssPath: 'src/css/dashboard.css',
        template,
        logic: async () => {
            // import dinamico de la lógica y ejecucion
            const mod = await import('../logic/dashboard.js');
            if (mod && typeof mod.initDashboard === 'function') await mod.initDashboard();
        }
    };
}
