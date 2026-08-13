export const isTgpl2Project = (projectId, activeProject = null) => {
  const projectIdValue = String(projectId ?? activeProject?.id ?? '');
  const projectType = activeProject?.project_type || '';
  return projectIdValue === '4' || projectType === 'TGPL2_SURVEY' || projectType === 'TGPL_2_SURVEY';
};

export const isTgplProject = (projectId, activeProject = null) => {
  const projectIdValue = String(projectId ?? activeProject?.id ?? '');
  const projectType = activeProject?.project_type || '';
  return projectIdValue === '3' || projectType === 'TGPL_SURVEY' || projectType === 'TGPL_1_SURVEY';
};
