export const datasetModes = ["demo", "analytical"] as const;
export type DatasetMode = (typeof datasetModes)[number];
