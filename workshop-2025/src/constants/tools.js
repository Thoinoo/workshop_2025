export const TOOL_IDS = {
  FILE_FIXER: "fileFixer",
  HASH_TRANSLATOR: "hashTranslator",
};

export const TOOL_DEFINITIONS = {
  [TOOL_IDS.FILE_FIXER]: {
    id: TOOL_IDS.FILE_FIXER,
    name: "File Fixer",
    description: "Cet outil genial permet de reparer les fichiers corrompus.",
  },
  [TOOL_IDS.HASH_TRANSLATOR]: {
    id: TOOL_IDS.HASH_TRANSLATOR,
    name: "Hash Translator",
    description: "Decode un hash pour identifier la bonne case a cibler.",
  },
};

export const TOOL_LIST = Object.values(TOOL_DEFINITIONS);
