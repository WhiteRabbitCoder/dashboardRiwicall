import template from '../../views/candidatesView.html?raw';

export async function candidatesView() {
	return {
		title: 'Gestión de Candidatos',
		cssPath: 'src/css/candidatos.css',
		template,
		logic: async () => {
			const mod = await import('../logic/candidates.js');
			if (mod && typeof mod.initCandidatesView === 'function') mod.initCandidatesView();
		}
	};
}
