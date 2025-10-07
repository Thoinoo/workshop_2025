export const TOOL_IDS = {
  FILE_FIXER: "fileFixer",
};

export const TOOL_DEFINITIONS = {
  [TOOL_IDS.FILE_FIXER]: {
    id: TOOL_IDS.FILE_FIXER,
    name: "File Fixer",
    description: "Cet outil genial permet de reparer les fichiers corrompus.",
  },
};

export const TOOL_LIST = Object.values(TOOL_DEFINITIONS);
