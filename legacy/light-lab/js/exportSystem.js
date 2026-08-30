export const LIGHT_LAB_PROJECT_SCHEMA = 'kaoru.light-lab.project';
export const LIGHT_LAB_PROJECT_VERSION = 1;

export function buildExportEnvelope(state) {
  const timestamp = new Date().toISOString();
  return {
    schema: LIGHT_LAB_PROJECT_SCHEMA,
    version: LIGHT_LAB_PROJECT_VERSION,
    studio: 'light',
    phase: 1,
    exportedAt: timestamp,
    project: { ...state.project, updatedAt: timestamp },
    selection: structuredClone(state.selection),
    palette: structuredClone(state.palette),
    lighting: structuredClone(state.lighting),
    reference: { image: null, extractedColors: [...state.reference.extractedColors] },
    compatibility: { minimumLightLabVersion: 1, future3d: null }
  };
}

export function downloadPhaseOneStructure(state) {
  const data = JSON.stringify(buildExportEnvelope(state), null, 2);
  const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `LLS-BASE-${new Date().toISOString().slice(0, 10)}.lls.json`;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}
