export type ActivationType = "sigmoid" | "tanh" | "relu" | "linear";

export const ACTIVATIONS: Record<ActivationType, {
  fn: (x: number) => number;
  deriv: (x: number) => number;
  label: string;
}> = {
  sigmoid: {
    fn: (x: number): number => 1 / (1 + Math.exp(-Math.max(-100, Math.min(100, x)))),
    deriv: (x: number): number => {
      const s = 1 / (1 + Math.exp(-Math.max(-100, Math.min(100, x))));
      return s * (1 - s);
    },
    label: "Sigmoid",
  },
  tanh: {
    fn: (x: number): number => Math.tanh(x),
    deriv: (x: number): number => 1 - Math.tanh(x) ** 2,
    label: "Tanh",
  },
  relu: {
    fn: (x: number): number => Math.max(0, x),
    deriv: (x: number): number => x > 0 ? 1 : 0,
    label: "ReLU",
  },
  linear: {
    fn: (x: number): number => x,
    deriv: (_x: number): number => 1,
    label: "Linear",
  },
};

export function getActivation(name: ActivationType) {
  return ACTIVATIONS[name];
}
