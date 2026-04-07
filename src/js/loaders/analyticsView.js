import template from '../../views/analyticsView.html?raw';

export async function analyticsView() {
    return {
        title: 'Analítica de RiwiCalls',
        cssPath: 'src/css/analitica.css',
        template,
        logic: async () => {
            const mod = await import('../logic/analytics.js');
            if (mod && typeof mod.initAnalyticsView === 'function') await mod.initAnalyticsView();
        }
    };
}
