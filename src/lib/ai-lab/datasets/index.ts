export interface Dataset {
  name: string;
  description: string;
  inputSize: number;
  outputSize: number;
  inputs: number[][];
  targets: number[][];
  featureLabels: string[];
  classLabels?: string[];
}

const XOR_DATASET: Dataset = {
  name: "XOR",
  description: "XOR logic gate — classic non-linear classification problem. 4 samples, 2 inputs, 1 binary output.",
  inputSize: 2,
  outputSize: 1,
  inputs: [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
  targets: [
    [0],
    [1],
    [1],
    [0],
  ],
  featureLabels: ["Input A", "Input B"],
  classLabels: ["Output"],
};

const TWO_CLASS_2D: Dataset = {
  name: "2D Classification",
  description: "Synthetic 2D binary classification dataset with 20 samples in two clusters.",
  inputSize: 2,
  outputSize: 1,
  inputs: [],
  targets: [],
  featureLabels: ["Feature X", "Feature Y"],
  classLabels: ["Class 0 / Class 1"],
};

function generate2DClassification(): { inputs: number[][]; targets: number[][] } {
  const inputs: number[][] = [];
  const targets: number[][] = [];
  const rng = seededRng(42);

  for (let i = 0; i < 10; i++) {
    const x = 0.3 + rng() * 0.4;
    const y = 0.3 + rng() * 0.4;
    inputs.push([x, y]);
    targets.push([0]);
  }
  for (let i = 0; i < 10; i++) {
    const x = 0.6 + rng() * 0.4;
    const y = 0.6 + rng() * 0.4;
    inputs.push([x, y]);
    targets.push([1]);
  }
  return { inputs, targets };
}

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return (s >>> 0) / 0x7fffffff;
  };
}

const generated2D = generate2DClassification();
TWO_CLASS_2D.inputs = generated2D.inputs;
TWO_CLASS_2D.targets = generated2D.targets;

export const BUILT_IN_DATASETS: Record<string, Dataset> = {
  xor: XOR_DATASET,
  "2d-classification": TWO_CLASS_2D,
};

export function getDataset(name: string): Dataset | null {
  return BUILT_IN_DATASETS[name] || null;
}

export function listDatasets(): { name: string; description: string; inputSize: number; outputSize: number }[] {
  return Object.values(BUILT_IN_DATASETS).map((d) => ({
    name: d.name,
    description: d.description,
    inputSize: d.inputSize,
    outputSize: d.outputSize,
  }));
}

export function validateDataset(datasetName: string): string | null {
  if (!datasetName) return "Dataset name is required.";
  if (!BUILT_IN_DATASETS[datasetName]) {
    return `Unknown dataset '${datasetName}'. Available: ${Object.keys(BUILT_IN_DATASETS).join(", ")}`;
  }
  return null;
}
