import template from '../../views/trackingView.html?raw';

export async function trackingView() {
    return {
        title: 'Seguimiento de Estados',
        cssPath: 'src/css/seguimiento.css',
        template,
        logic: async () => {
            const mod = await import('../logic/tracking.js');
            if (mod && typeof mod.initTrackingView === 'function') await mod.initTrackingView();
        }
    };
}
