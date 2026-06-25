import { Matrix } from "./matrix";
import { getActivation, type ActivationType } from "./activations";

export interface LayerConfig {
  inputSize: number;
  outputSize: number;
  activation: ActivationType;
}

export interface NetworkConfig {
  layers: LayerConfig[];
}

export interface LayerState {
  weights: number[][];
  biases: number[];
  activation: ActivationType;
  inputSize: number;
  outputSize: number;
}

export interface NetworkState {
  layers: LayerState[];
  layerCount: number;
}

export interface ForwardResult {
  layerInputs: Matrix[];
  layerOutputs: Matrix[];
  finalOutput: Matrix;
}

export class Layer {
  weights: Matrix;
  biases: Matrix;
  activation: ActivationType;
  inputSize: number;
  outputSize: number;

  constructor(inputSize: number, outputSize: number, activation: ActivationType, seed?: number) {
    this.inputSize = inputSize;
    this.outputSize = outputSize;
    this.activation = activation;
    this.weights = Matrix.random(outputSize, inputSize, seed);
    this.biases = new Matrix(outputSize, 1);
  }

  forward(input: Matrix): Matrix {
    const z = Matrix.add(Matrix.multiply(this.weights, input), this.biases);
    const act = getActivation(this.activation);
    return z.map((v) => act.fn(v));
  }

  getState(): LayerState {
    return {
      weights: this.weights.toJSON(),
      biases: this.biases.toArray(),
      activation: this.activation,
      inputSize: this.inputSize,
      outputSize: this.outputSize,
    };
  }

  static fromState(state: LayerState): Layer {
    const layer = new Layer(state.inputSize, state.outputSize, state.activation);
    layer.weights = Matrix.fromJSON(state.weights);
    layer.biases = Matrix.fromArray(state.biases);
    return layer;
  }
}

export class Network {
  layers: Layer[];

  constructor(config: NetworkConfig) {
    this.layers = config.layers.map(
      (lc) => new Layer(lc.inputSize, lc.outputSize, lc.activation)
    );
  }

  forward(input: Matrix): ForwardResult {
    const layerInputs: Matrix[] = [input];
    const layerOutputs: Matrix[] = [];

    let current = input;
    for (const layer of this.layers) {
      const output = layer.forward(current);
      layerOutputs.push(output);
      layerInputs.push(output);
      current = output;
    }

    return {
      layerInputs,
      layerOutputs,
      finalOutput: current,
    };
  }

  predict(input: number[]): number[] {
    const result = this.forward(Matrix.fromArray(input));
    return result.finalOutput.toArray();
  }

  train(
    inputs: number[][],
    targets: number[][],
    learningRate: number
  ): { loss: number; accuracy?: number } {
    const batchSize = inputs.length;
    const lossHistory: number[] = [];
    let correct = 0;

    const weightGradients = this.layers.map(() => ({ w: 0, b: 0 }));
    const layerWeightGrads = this.layers.map(() => ({
      weights: new Matrix(0, 0),
      biases: new Matrix(0, 0),
    }));

    let totalLoss = 0;

    for (let b = 0; b < batchSize; b++) {
      const inputVec = Matrix.fromArray(inputs[b]);
      const targetVec = Matrix.fromArray(targets[b]);

      const { layerInputs, layerOutputs } = this.forward(inputVec);

      const output = layerOutputs[layerOutputs.length - 1];
      const outputErrors = Matrix.subtract(targetVec, output);

      const squaredErrors = outputErrors.map((v) => v * v);
      const sampleLoss = squaredErrors.toArray().reduce((a, b) => a + b, 0) / outputErrors.rows;
      totalLoss += sampleLoss;

      if (this.layers[this.layers.length - 1].activation === "sigmoid" || 
          this.layers[this.layers.length - 1].activation === "tanh") {
        const predictedClass = output.data[0].indexOf(Math.max(...output.data[0]));
        const targetClass = targetVec.data[0].indexOf(Math.max(...targetVec.data[0]));
        if (predictedClass === targetClass) correct++;
      }

      let errors = outputErrors;

      for (let l = this.layers.length - 1; l >= 0; l--) {
        const layer = this.layers[l];
        const layerInput = layerInputs[l];
        const layerOutput = layerOutputs[l];
        const act = getActivation(layer.activation);

        const gradients = layerOutput.map((v) => act.deriv(v));
        const delta = errors.map((v, i) => v * gradients.data[i][0]);

        if (l === this.layers.length - 1) {
          layerWeightGrads[l] = {
            weights: Matrix.multiply(delta, Matrix.transpose(layerInput)),
            biases: delta.clone(),
          };
        } else {
          const nextWeights = this.layers[l + 1].weights;
          errors = Matrix.multiply(Matrix.transpose(nextWeights), errors);
          const delta2 = errors.map((v, i) => v * gradients.data[i][0]);
          layerWeightGrads[l] = {
            weights: Matrix.multiply(delta2, Matrix.transpose(layerInput)),
            biases: delta2.clone(),
          };
          errors = Matrix.multiply(Matrix.transpose(nextWeights), errors);
        }

        errors = delta;
      }
    }

    for (let l = 0; l < this.layers.length; l++) {
      const grad = layerWeightGrads[l];
      if (grad.weights.rows === 0) continue;
      this.layers[l].weights = this.layers[l].weights.map(
        (v, i, j) => v + grad.weights.data[i][j] * (learningRate / batchSize)
      );
      this.layers[l].biases = this.layers[l].biases.map(
        (v, i) => v + grad.biases.data[i][0] * (learningRate / batchSize)
      );
    }

    const avgLoss = totalLoss / batchSize;

    let accuracy: number | undefined;
    if (this.layers[this.layers.length - 1].activation === "sigmoid" || 
        this.layers[this.layers.length - 1].activation === "tanh") {
      accuracy = correct / batchSize;
    }

    return { loss: avgLoss, accuracy };
  }

  getState(): NetworkState {
    return {
      layers: this.layers.map((l) => l.getState()),
      layerCount: this.layers.length,
    };
  }

  static fromState(state: NetworkState): Network {
    const config: NetworkConfig = {
      layers: state.layers.map((ls) => ({
        inputSize: ls.inputSize,
        outputSize: ls.outputSize,
        activation: ls.activation,
      })),
    };
    const network = new Network(config);
    network.layers = state.layers.map((ls) => Layer.fromState(ls));
    return network;
  }
}

export function validateArchitecture(config: NetworkConfig): string | null {
  if (!config.layers || !Array.isArray(config.layers)) {
    return "Architecture must have a layers array.";
  }
  if (config.layers.length < 1) {
    return "At least 1 layer is required.";
  }
  if (config.layers.length > 6) {
    return "Maximum 6 layers allowed.";
  }
  for (let i = 0; i < config.layers.length; i++) {
    const lc = config.layers[i];
    if (!lc.inputSize || !lc.outputSize || !lc.activation) {
      return `Layer ${i + 1} must have inputSize, outputSize, and activation.`;
    }
    if (lc.inputSize < 1 || lc.inputSize > 128) {
      return `Layer ${i + 1} inputSize must be between 1 and 128.`;
    }
    if (lc.outputSize < 1 || lc.outputSize > 64) {
      return `Layer ${i + 1} outputSize must be between 1 and 64.`;
    }
    if (!["sigmoid", "tanh", "relu", "linear"].includes(lc.activation)) {
      return `Layer ${i + 1} activation must be sigmoid, tanh, relu, or linear.`;
    }
    if (i > 0 && config.layers[i].inputSize !== config.layers[i - 1].outputSize) {
      return `Layer ${i + 1} inputSize must match layer ${i} outputSize.`;
    }
  }
  return null;
}
