export class Matrix {
  rows: number;
  cols: number;
  data: number[][];

  constructor(rows: number, cols: number, values?: number[][]) {
    this.rows = rows;
    this.cols = cols;
    if (values) {
      if (values.length !== rows || values.some(r => r.length !== cols)) {
        throw new Error(`Invalid matrix dimensions: expected ${rows}x${cols}`);
      }
      this.data = values.map(r => [...r]);
    } else {
      this.data = Array.from({ length: rows }, () => new Array(cols).fill(0));
    }
  }

  static fromArray(arr: number[]): Matrix {
    const m = new Matrix(arr.length, 1);
    for (let i = 0; i < arr.length; i++) {
      m.data[i][0] = arr[i];
    }
    return m;
  }

  toArray(): number[] {
    const result: number[] = [];
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        result.push(this.data[i][j]);
      }
    }
    return result;
  }

  static random(rows: number, cols: number, seed?: number): Matrix {
    const m = new Matrix(rows, cols);
    const rng = seed !== undefined ? seededRandom(seed) : Math.random;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        m.data[i][j] = (rng() * 2 - 1) * Math.sqrt(1 / cols);
      }
    }
    return m;
  }

  static multiply(a: Matrix, b: Matrix): Matrix {
    if (a.cols !== b.rows) {
      throw new Error(`Matrix multiply dimensions mismatch: ${a.cols} !== ${b.rows}`);
    }
    const result = new Matrix(a.rows, b.cols);
    for (let i = 0; i < a.rows; i++) {
      for (let j = 0; j < b.cols; j++) {
        let sum = 0;
        for (let k = 0; k < a.cols; k++) {
          sum += a.data[i][k] * b.data[k][j];
        }
        result.data[i][j] = sum;
      }
    }
    return result;
  }

  static add(a: Matrix, b: Matrix): Matrix {
    if (a.rows !== b.rows || a.cols !== b.cols) {
      throw new Error(`Matrix add dimensions mismatch: ${a.rows}x${a.cols} !== ${b.rows}x${b.cols}`);
    }
    const result = new Matrix(a.rows, a.cols);
    for (let i = 0; i < a.rows; i++) {
      for (let j = 0; j < a.cols; j++) {
        result.data[i][j] = a.data[i][j] + b.data[i][j];
      }
    }
    return result;
  }

  static subtract(a: Matrix, b: Matrix): Matrix {
    if (a.rows !== b.rows || a.cols !== b.cols) {
      throw new Error(`Matrix subtract dimensions mismatch`);
    }
    const result = new Matrix(a.rows, a.cols);
    for (let i = 0; i < a.rows; i++) {
      for (let j = 0; j < a.cols; j++) {
        result.data[i][j] = a.data[i][j] - b.data[i][j];
      }
    }
    return result;
  }

  static transpose(a: Matrix): Matrix {
    const result = new Matrix(a.cols, a.rows);
    for (let i = 0; i < a.rows; i++) {
      for (let j = 0; j < a.cols; j++) {
        result.data[j][i] = a.data[i][j];
      }
    }
    return result;
  }

  map(fn: (val: number, row: number, col: number) => number): Matrix {
    const result = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        result.data[i][j] = fn(this.data[i][j], i, j);
      }
    }
    return result;
  }

  apply(fn: (val: number) => number): void {
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        this.data[i][j] = fn(this.data[i][j]);
      }
    }
  }

  clone(): Matrix {
    return new Matrix(this.rows, this.cols, this.data);
  }

  toJSON(): number[][] {
    return this.data.map(r => [...r]);
  }

  static fromJSON(data: number[][]): Matrix {
    return new Matrix(data.length, data[0].length, data);
  }
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}
