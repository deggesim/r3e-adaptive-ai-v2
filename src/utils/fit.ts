// Simple matrix operations for linear algebra
class Matrix {
  data: number[][];

  constructor(data: number[][]) {
    this.data = data;
  }

  static mul(a: Matrix, b: Matrix): Matrix {
    const result: number[][] = [];
    for (let i = 0; i < a.rows; i++) {
      result[i] = [];
      for (let j = 0; j < b.cols; j++) {
        let sum = 0;
        for (let k = 0; k < a.cols; k++) {
          sum += a.data[i][k] * b.data[k][j];
        }
        result[i][j] = sum;
      }
    }
    return new Matrix(result);
  }

  static transpose(m: Matrix): Matrix {
    const result: number[][] = [];
    for (let i = 0; i < m.cols; i++) {
      result[i] = [];
      for (let j = 0; j < m.rows; j++) {
        result[i][j] = m.data[j][i];
      }
    }
    return new Matrix(result);
  }

  static concath(a: Matrix, b: Matrix): Matrix {
    const result: number[][] = [];
    for (let i = 0; i < a.rows; i++) {
      result[i] = [...a.data[i], ...b.data[i]];
    }
    return new Matrix(result);
  }

  get rows(): number {
    return this.data.length;
  }

  get cols(): number {
    return this.data[0]?.length || 0;
  }

  dogauss(): void {
    // Simplified Gaussian elimination for this specific use case
    // This is a basic implementation - in production you'd want a more robust library
    const n = this.rows;
    for (let p = 0; p < n; p++) {
      // Find pivot row
      let max = p;
      for (let i = p + 1; i < n; i++) {
        if (Math.abs(this.data[i][p]) > Math.abs(this.data[max][p])) {
          max = i;
        }
      }

      // Swap rows
      [this.data[p], this.data[max]] = [this.data[max], this.data[p]];

      // Check for singular matrix
      if (Math.abs(this.data[p][p]) < 1e-10) {
        throw new Error('Matrix is singular');
      }

      // Eliminate
      for (let i = p + 1; i < n; i++) {
        const alpha = this.data[i][p] / this.data[p][p];
        for (let j = p; j < n + 1; j++) {
          this.data[i][j] -= alpha * this.data[p][j];
        }
      }
    }

    // Back substitution
    for (let i = n - 1; i >= 0; i--) {
      let sum = 0;
      for (let j = i + 1; j < n; j++) {
        sum += this.data[i][j] * this.data[i][n];
      }
      this.data[i][n] = (this.data[i][n] - sum) / this.data[i][i];
    }
  }
}

function getResults(mtx: Matrix): number[] {
  const cols = mtx.cols;
  const results: number[] = [];
  for (let i = 0; i < mtx.rows; i++) {
    results[i] = mtx.data[i][cols - 1];
  }
  return results;
}

export const fit = {
  linear(xValues: number[], yValues: number[]): [number, number] {
    const aVals: number[][] = [];
    const yVals: number[][] = [];

    for (let i = 0; i < xValues.length; i++) {
      aVals[i] = [1, xValues[i]];
      yVals[i] = [yValues[i]];
    }

    const A = new Matrix(aVals);
    const Y = new Matrix(yVals);

    const ATA = Matrix.mul(Matrix.transpose(A), A);
    const ATY = Matrix.mul(Matrix.transpose(A), Y);

    const ATAATY = Matrix.concath(ATA, ATY);

    ATAATY.dogauss();

    const results = getResults(ATAATY);
    return [results[0], results[1]];
  },

  parabola(xValues: number[], yValues: number[]): [number, number, number] {
    const aVals: number[][] = [];
    const yVals: number[][] = [];

    for (let i = 0; i < xValues.length; i++) {
      const x = xValues[i];
      aVals[i] = [1, x, x * x];
      yVals[i] = [yValues[i]];
    }

    const A = new Matrix(aVals);
    const Y = new Matrix(yValues.map(y => [y]));

    const ATA = Matrix.mul(Matrix.transpose(A), A);
    const ATY = Matrix.mul(Matrix.transpose(A), Y);

    const ATAATY = Matrix.concath(ATA, ATY);

    ATAATY.dogauss();

    const results = getResults(ATAATY);
    return [results[0], results[1], results[2]];
  },
};