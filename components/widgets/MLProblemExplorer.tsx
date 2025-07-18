"use client";
import React, { useState, useMemo } from "react";
import { InlineMath } from "react-katex";
import ReactMarkdown from "react-markdown";
import NumberedMath from "@/components/content/NumberedMath";
import { Tooltip } from "@/components/content/Tooltip";
import EquationRef from "@/components/content/EquationRef";

// Types -------------------------------------------------------

interface Point2D {
  x: number;
  y: number;
}
interface LabeledPoint2D extends Point2D {
  label: 0 | 1;
}

type Mode = "meanVariance" | "linearRegression" | "kMeans" | "logisticRegression";

// Default datasets -------------------------------------------

const defaultMeanVar = [-1.9, -1.2, -0.4, 0.3, 1.1, 1.8];
const defaultLinReg: Point2D[] = [
  { x: -3, y: -2.8 },
  { x: -2, y: -1.4 },
  { x: -1, y: -0.6 },
  { x: 0, y: 0.3 },
  { x: 1, y: 1.8 },
  { x: 2, y: 2.4 },
  { x: 3, y: 3.1 },
];
const defaultKMeans: Point2D[] = [
  { x: -2, y: -1 },
  { x: -1.5, y: -1.2 },
  { x: -2.2, y: -0.7 },
  { x: 2, y: 2 },
  { x: 1.5, y: 2.1 },
  { x: 2.3, y: 1.7 },
  { x: 0, y: -2 },
  { x: 0.3, y: -1.8 },
  { x: -0.4, y: -2.2 },
];
const defaultLogReg: LabeledPoint2D[] = [
  { x: -2, y: -2, label: 0 },
  { x: -1, y: -1.5, label: 0 },
  { x: -1.5, y: -2.5, label: 0 },
  { x: 2, y: 2, label: 1 },
  { x: 1.2, y: 2.5, label: 1 },
  { x: 2.5, y: 1.5, label: 1 },
];

// Helper math -------------------------------------------------

const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
const variance = (arr: number[]) => {
  const m = mean(arr);
  return arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / (arr.length || 1);
};

const solveLinearRegression = (pts: Point2D[]) => {
  const n = pts.length;
  const sumX = pts.reduce((acc, p) => acc + p.x, 0);
  const sumY = pts.reduce((acc, p) => acc + p.y, 0);
  const sumXY = pts.reduce((acc, p) => acc + p.x * p.y, 0);
  const sumX2 = pts.reduce((acc, p) => acc + p.x * p.x, 0);
  const denom = n * sumX2 - sumX ** 2;
  if (denom === 0) return { a: 0, b: 0 };
  const a = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - a * sumX) / n;
  return { a, b };
};

const kMeans = (pts: Point2D[], k: number, iterations = 10) => {
  if (pts.length === 0) return { centroids: [], assignments: [] };
  // simple random init
  let centroids = pts.slice(0, k).map((p) => ({ ...p }));
  let assignments: number[] = [];
  for (let iter = 0; iter < iterations; iter++) {
    // assign
    assignments = pts.map((p) => {
      let best = 0,
        bestDist = Infinity;
      centroids.forEach((c, idx) => {
        const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
        if (d < bestDist) {
          bestDist = d;
          best = idx;
        }
      });
      return best;
    });
    // update centroids
    centroids = centroids.map((c, idx) => {
      const clusterPts = pts.filter((_, i) => assignments[i] === idx);
      if (clusterPts.length === 0) return c;
      return {
        x: mean(clusterPts.map((p) => p.x)),
        y: mean(clusterPts.map((p) => p.y)),
      };
    });
  }
  return { centroids, assignments };
};

// Simple logistic regression (2D) using gradient descent
const solveLogistic = (pts: LabeledPoint2D[], steps = 1000, lr = 0.1) => {
  let w = { x: 0, y: 0, b: 0 };
  const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
  for (let s = 0; s < steps; s++) {
    let gradX = 0,
      gradY = 0,
      gradB = 0;
    pts.forEach((p) => {
      const z = w.x * p.x + w.y * p.y + w.b;
      const pred = sigmoid(z);
      const error = pred - p.label;
      gradX += error * p.x;
      gradY += error * p.y;
      gradB += error;
    });
    const n = pts.length;
    w.x -= (lr * gradX) / n;
    w.y -= (lr * gradY) / n;
    w.b -= (lr * gradB) / n;
  }
  return w;
};

// Formulas & explanations (verbatim) --------------------------

const content = {
  meanVariance: {
    model: `p(x_1,\\ldots,x_n\\mid \\mu,\\sigma^2) = \\prod_{i=1}^n \\frac{1}{\\sqrt{2\\pi\\sigma^2}} e^{-\\frac{(x_i-\\mu)^2}{2\\sigma^2}}`,
    loss: `\\hat{\\mu} = \\arg\\min_{\\mu} \\sum_{i = 1}^n (x_i-\\mu)^2`,
    explanation: () => (
      <div>
        <p>
          Given a set of numbers <NumberedMath math="x_1, \dots, x_n" />, how do we estimate their mean and variance?
          We&apos;ve already approached this riddle from various angles. Now, let&apos;s combine our insights.
        </p>
        <p>
          First, we transform the general idea that mean and variance are important into a concrete probabilistic model.
          The maximum entropy principle suggests modeling the data as independent samples drawn from{" "}
          <a href="04-max_entropy#normal">the Gaussian distribution</a>.
        </p>
        <p>
          Once we have a set of possible models—all Gaussian distributions—we can select the best one using{" "}
          <a href="03-minimizing#mle">the maximum likelihood principle</a>.
        </p>
        <p>
          We want to find <NumberedMath math="\hat\mu, \hat\sigma^2" /> that maximize
        </p>
        <div className="my-4 text-center">
          <NumberedMath
            displayMode={true}
            math="\hat\mu, \hat\sigma^2 = \argmin_{\mu, \sigma^2} \prod_{i = 1}^N \frac{1}{\sqrt{2\pi\sigma^2}} e^{-\frac{(x_i-\mu)^2}{2\sigma^2}}"
          />
        </div>
        <p>
          It&apos;s typically easier to write down the logarithm of the likelihood function. As{" "}
          <a href="04-mle">we discussed</a>, we can call it cross-entropy minimization or log-likelihood maximization.
          In any case, the problem simplifies to this:
        </p>
        <NumberedMath
          displayMode={true}
          math="\hat\mu, \hat\sigma^2 = \argmax_{\mu, \sigma^2} \sum_{i = 1}^n \log\left( \frac{1}{\sqrt{2\pi\sigma^2}} e^{-\frac{(X_i-\mu)^2}{2\sigma^2}} \right) 
= \argmin_{\mu, \sigma^2} n \cdot \log \sqrt{2\pi\sigma^2} + \sum_{i = 1}^n \frac{(X_i-\mu)^2}{2\sigma^2}"
        />
        <p>
          There are several ways to solve this optimization problem. Differentiation is likely the cleanest: If we
          define <NumberedMath math="\mathcal{L}" /> to be the expression above, then:
        </p>
        <NumberedMath
          displayMode={true}
          math="\frac{\partial \mathcal{L}}{\partial \mu} = \frac{1}{\sigma^2} \sum_{i = 1}^n 2(X_i - \mu) "
        />
        <p>
          Setting <NumberedMath math="\frac{\partial \mathcal{L}}{\partial \mu} = 0" /> leads to{" "}
          <NumberedMath math="\hat\mu = \frac{1}{n} \sum_{i=1}^n X_i" />. Similarly,
        </p>
        <NumberedMath
          displayMode={true}
          math="\frac{\partial \mathcal{L}}{\partial \sigma} = n/\sigma - \sum_{i = 1}^n \frac{(X_i-\mu)^2}{\sigma^3}"
        />
        <p>
          Setting <NumberedMath math="\frac{\partial \mathcal{L}}{\partial \sigma} = 0" /> then leads to{" "}
          <NumberedMath math="\hat\sigma^2 = \frac{1}{n} \sum_{i = 1}^n (X_i - \mu)^2" />.
        </p>
        <p>
          What I want to emphasize is how our only initial assumption about the data was simply, &quot;we have a bunch
          of numbers, and we care about their mean and variance.&quot; The KL divergence framework that reduced the rest of the problem to
          running the math autopilot.
        </p>
      </div>
    ),
  },
  linearRegression: {
    model: `p((x_1,y_1),\\ldots(x_n,y_n) \\mid a,b,\\sigma^2) = \\prod_{i=1}^n \\frac{1}{\\sqrt{2\\pi\\sigma^2}} e^{-\\frac{(a x_i + b - y_i)^2}{2\\sigma^2}}`,
    loss: `\\hat{a},\\hat{b} = \\arg\\min_{a,b} \\sum_{i=1}^n (a x_i + b - y_i)^2`,
    explanation: () => (
      <div>
        <p>
          Suppose we are given a list of pairs <NumberedMath math="(x_1, y_1), \dots, (x_n, y_n)" />. We believe the
          data exhibits a roughly linear dependency, meaning there exist some constants <NumberedMath math="a,b" /> such
          that <NumberedMath math="y_i \approx a\cdot x_i + b" />. Our objective is to determine{" "}
          <NumberedMath math="a" /> and <NumberedMath math="b" />.
        </p>

        <p>
          Let&apos;s transform this into a concrete probabilistic model. We&apos;ll model the data by assuming{" "}
          <NumberedMath math="y_i" /> originates from the distribution{" "}
          <NumberedMath displayMode={true} math="a\cdot x_i + b + \text{noise}." />
        </p>

        <p>
          The noise is generated from a real-valued distribution. How do we choose it? The uniform distribution
          doesn&apos;t normalize over the real numbers, making it unsuitable; the same applies to the exponential
          distribution. The next choice on the menu is the <strong>Gaussian distribution</strong>{" "}
          <NumberedMath math="N(\mu, \sigma^2)" />, so let&apos;s go with that. This introduces a slight complication as
          we now have two new parameters
          <NumberedMath math="\mu, \sigma^2" /> in our model{" "}
          <NumberedMath math="y_i \sim a\cdot x_i + b + N(\mu, \sigma^2)" />, even though we only care about{" "}
          <NumberedMath math="a, b" /> and not <NumberedMath math="\mu, \sigma^2" />.
        </p>

        <p>
          But this is fine. We can assume <NumberedMath math="\mu = 0" />, because otherwise, we could replace{" "}
          <NumberedMath math="N(\mu, \sigma^2)" /> with <NumberedMath math="N(0, \sigma^2)" /> and{" "}
          <NumberedMath math="b" /> with <NumberedMath math="b + \mu" /> to achieve the same data model. We&apos;ll
          address <NumberedMath math="\sigma" /> in a moment.
        </p>

        <p>
          Let&apos;s proceed with our recipe and apply the maximum likelihood principle. We write down the likelihood -
          the probability of our data being sampled from the model distribution:
        </p>

        <div className="my-4 text-center">
          <NumberedMath math="P((x_1, y_1), \dots, (x_n, y_n) | a, b, \sigma^2, x_1, \dots, x_n) = \prod_{i = 1}^n \frac{1}{\sqrt{2\pi\sigma^2}} e^{-\frac{(ax_i + b - y_i)^2}{2\sigma^2}}" />
        </div>

        <p>As usual, it&apos;s simpler to consider the log-likelihood (or cross-entropy):</p>

        <div className="my-4 text-center">
          <NumberedMath math="\log P(\text{data} | \text{parameters}) = -\frac{n}{2}\ln(2\pi\sigma^2) - \frac{1}{2\sigma^2} \sum_{i=1}^n (a\cdot x_i + b - y_i)^2" />
        </div>

        <p>
          This expression appears rather complex, but we notice that for any fixed value of{" "}
          <NumberedMath math="\sigma^2" />, the optimization problem for <NumberedMath math="a,b" /> reduces to
          minimizing:
        </p>

        <div className="my-4 text-center">
          <NumberedMath
            displayMode={true}
            math="\hat{a}, \hat{b} = \argmin_{a,b} \sum_{i=1}^n (a\cdot x_i + b - y_i)^2"
          />
        </div>

        <p>
          Therefore, we can effectively disregard the added parameter <NumberedMath math="\sigma^2" /> and simply
          optimize above expression, which is the classical{" "}
          <a href="https://en.wikipedia.org/wiki/Ordinary_least_squares">least-squares loss function</a> for linear
          regression. Notice how the square in the loss function emerged directly from our maximum entropy assumption of
          Gaussian noise.
        </p>
      </div>
    ),
  },
  kMeans: {
    model: `p(x) = \\frac{1}{k} \\sum_{j=1}^k \\mathcal{N}(x\\mid \\mu_j,\\sigma^2 I)`,
    loss: `\\argmin_{\\mu_1,\\ldots,\\mu_k} \\sum_{i=1}^n \\min_j \\|x_i-\\mu_j\\|^2`,
    explanation: () => (
      <div>
        <p>
          We are given a set of points <NumberedMath math="x_1, \dots, x_n" /> on, say, a 2D plane. Our objective is to
          group them into <NumberedMath math="k" /> clusters.
        </p>

        <p>
          Let&apos;s transform this into a probabilistic model. We&apos;ll use{" "}
          <NumberedMath math="\mu_1, \dots, \mu_k" /> to represent the centers of these clusters. The significance of
          these points is that if a point <NumberedMath math="x_i" /> belongs to cluster <NumberedMath math="j" />, then
          its Euclidean distance <NumberedMath math="||x_i - \mu_j||" /> should be small.
        </p>

        <p>
          As before, we can employ the maximum entropy distribution to construct a concrete model. Since the exponential
          function doesn&apos;t normalize, we will use the Gaussian. This time, we need to use the{" "}
          <a href="https://en.wikipedia.org/wiki/Multivariate_normal_distribution">Multivariate Gaussian</a> but
          don&apos;t worry, the 2D Gaussian with mean <NumberedMath math="\mu" /> and covariance matrix{" "}
          <NumberedMath math="\Sigma" /> is still the max-entropy distribution with that mean and that covariance. We
          will use{" "}
          <NumberedMath
            displayMode={true}
            math="\Sigma = \begin{pmatrix} \sigma^2 & 0 \\ 0 & \sigma^2 \end{pmatrix},"
          />{" "}
          this corresponds to a nice rotationally symmetric distribution that looks like{" "}
          <Tooltip tooltip="![Multivariate Gaussian](07-machine_learning/Multivariate_Gaussian.png)">
            a beautiful hill
          </Tooltip>
          . We have
        </p>

        <div className="my-4 text-center">
          <NumberedMath math="p(x | \mu_j) = \frac{1}{2\pi\sigma^2} e^{-\frac{||x-\mu_j||^2}{2\sigma^2}}" />
        </div>

        <p>
          The notation <NumberedMath math="p(x | \mu_j)" /> signifies that this is our model for points originating from
          the <NumberedMath math="j" />
          -th cluster. However, we want a complete probabilistic model <NumberedMath math="p(x)" />. We can achieve this
          by assigning a prior probability to how likely each cluster is. The maximum entropy prior is the uniform
          distribution, so we will choose:
        </p>

        <div className="my-4 text-center">
          <NumberedMath math="p(x) = \frac{1}{k} \sum_{j = 1}^k p(x | \mu_j)" />
        </div>

        <p>
          We now have a probabilistic model that generates data <NumberedMath math="x" /> from a distribution{" "}
          <NumberedMath math="p" />. It&apos;s parameterized by <NumberedMath math="k+1" /> values:{" "}
          <NumberedMath math="\mu_1, \dots, \mu_k" />, and <NumberedMath math="\sigma^2" />. We will use maximum
          likelihood to determine these parameters. The principle dictates that we should maximize the following
          log-likelihood:
        </p>

        <div className="my-4 text-center">
          <NumberedMath
            displayMode={true}
            id="kmeans-likelihood"
            math="\argmax_{\substack{\mu_1, \dots, \mu_k \\ \sigma^2}}\,\,\, -n \log \left( k\cdot 2\pi\sigma^2\right) + \sum_{i = 1}^n  \log \sum_{j = 1}^k e^{-\frac{||x_i-\mu_j||^2}{2\sigma^2}}"
          />
        </div>

        <p>
          Optimizing this expression corresponds to an algorithm known as{" "}
          <a href="https://en.wikipedia.org/wiki/Fuzzy_clustering">
            soft <NumberedMath math="k" />
            -means
          </a>
          . The term &quot;soft&quot; indicates that if a new point <NumberedMath math="x" /> arrives, the parameter{" "}
          <NumberedMath math="\sigma" /> allows us to output a probability distribution for which cluster{" "}
          <NumberedMath math="x" /> belongs to.
        </p>

        <p>
          In practice, we typically don&apos;t care that much about probabilistic assignment in{" "}
          <NumberedMath math="k" />
          -means; knowing the closest cluster is usually sufficient. This corresponds to considering the limit as{" "}
          <NumberedMath math="\sigma \rightarrow 0" />. In this limit, <EquationRef id="kmeans-likelihood" /> simplifies
          quite elegantly. Specifically, we can replace the summation{" "}
          <NumberedMath math="\sum_{j = 1}^k e^{-\frac{||x_i-\mu_j||^2}{2\sigma^2}}" /> with{" "}
          <NumberedMath math="\max_{j = 1}^k e^{-\frac{||x_i-\mu_j||^2}{2\sigma^2}}" /> because all terms in the sum,
          except the largest one, become negligible as <NumberedMath math="\sigma \rightarrow 0" />. The expression then
          simplifies to:
        </p>

        <div className="my-4 text-center">
          <NumberedMath
            displayMode={true}
            math="\argmin_{\substack{\mu_1, \dots, \mu_k}} \sum_{i = 1}^n \min_{j = 1}^k ||x_i-\mu_j||^2"
          />
        </div>

        <p>
          The problem of finding <NumberedMath math="\mu_1, \dots, \mu_k" /> that minimize this expression is called{" "}
          <a href="https://en.wikipedia.org/wiki/K-means_clustering">
            <NumberedMath math="k" />
            -means
          </a>
          .
        </p>
      </div>
    ),
  },
  logisticRegression: {
    model: `p(\\text{red}|(x,y)) = \\sigma(\\lambda(\\theta\\cdot(x,y)+\\delta))`,
    loss: `\\argmin_{\\theta, \\delta, \\lambda} \\sum_{i = 1}^n \\ell_i \\log \\sigma(\\lambda (\\theta \\cdot (x_i,y_i) + \\delta)) + (1-\\ell_i) \\log (1-\\sigma(\\lambda (\\theta \\cdot (x_i,y_i) + \\delta)))`,
    explanation: () => (
      <div>
        <p>
          This time, we&apos;re presented with red and blue points on a plane, and our goal is to find the optimal line
          that separates them. Ideally, all red points would be on one side of the line, and all blue points on the
          other, but this isn&apos;t always achievable. In such cases, how do we determine the &quot;best&quot;
          separating line?
        </p>

        <p>
          It will be easier to represent the line not as <NumberedMath math="y = ax+b" />, but using its normal vector{" "}
          <NumberedMath math="\theta" /> (orthogonal to the line and of unit length) and the distance{" "}
          <NumberedMath math="\delta" /> of the origin from the line.
        </p>

        <p>
          Given a point <NumberedMath math="(x, y)" /> in the plane, the crucial quantity is its distance from our line.
          This can be calculated using the dot product as <NumberedMath math="\theta \cdot (x, y) + \delta" />.
        </p>

        <p>
          Now, employing the maximum entropy principle, we construct a probabilistic model that transforms this distance
          into a probability of color. It tells us that the right way of converting real numbers to probabilities is the{" "}
          <a href="04-max_entropy">logistic function</a>. That is, our probabilistic model says:
        </p>
        <div className="my-4 text-center">
          <NumberedMath math="p(\textrm{red} | (x, y)) = \sigma\left( \lambda (\theta \cdot (x, y) + \delta) \right)" />
        </div>
        <p>
          where <NumberedMath math="\sigma" /> is the logistic function{" "}
          <NumberedMath math="\sigma(x) = e^x / (1+e^x)" /> and <NumberedMath math="\lambda" /> is a new parameter that
          we have to optimize alongside <NumberedMath math="\theta" /> and <NumberedMath math="\delta" />. Naturally, we also have{" "}
          <NumberedMath math="p(\textrm{blue} | (x, y)) = 1 - p(\textrm{red} | (x, y))" />.
        </p>

        <p>
          The constant <NumberedMath math="\lambda" /> is fortunately quite useful parameter—it quantifies our
          confidence in the classification. This is convenient because if we want to classify a new point in the future,
          we can not only assign it a red/blue color based on which side of the line it falls, but also use our
          probabilistic model to compute how certain we are about our classification.
        </p>

        <p>
          Once we have a model, we can apply the maximum likelihood principle to find its parameters. This principle
          instructs us to find <NumberedMath math="\theta, \delta, \lambda" /> that minimize the following
          log-likelihood:
        </p>

        <div className="my-4 text-center">
          <NumberedMath
            displayMode={true}
            math="\argmin_{\theta, \delta, \lambda} \sum_{i = 1}^n \ell_i \log \sigma(\lambda (\theta \cdot (x_i,y_i) + \delta)) + (1-\ell_i) \log (1-\sigma(\lambda (\theta \cdot (x_i,y_i) + \delta)))"
          />
        </div>

        <p>
          where <NumberedMath math="\ell_i" /> is an indicator variable (i.e.,{" "}
          <NumberedMath math="\ell_i \in \{0,1\}" />) denoting whether the point <NumberedMath math="(x_i,y_i)" /> is
          red. This problem, known as{" "}
          <a href="https://en.wikipedia.org/wiki/Logistic_regression">logistic regression</a>, is hard to solve exactly,
          but gradient descent typically works well.
        </p>
      </div>
    ),
  },
} as const;

// Main component ---------------------------------------------

const CANVAS_SIZE = 400;

interface MLProblemExplorerProps {
  showExplanations?: boolean;
  defaultMode?: Mode;
}

export default function MLProblemExplorer({ showExplanations = true, defaultMode = "meanVariance" }: MLProblemExplorerProps) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [points1D, setPoints1D] = useState<number[]>(defaultMeanVar);
  const [points2D, setPoints2D] = useState<Point2D[]>(defaultLinReg);
  const [kmeansPts, setKmeansPts] = useState<Point2D[]>(defaultKMeans);
  const [logPts, setLogPts] = useState<LabeledPoint2D[]>(defaultLogReg);
  const [k, setK] = useState(3);
  const [logAddLabel, setLogAddLabel] = useState<0 | 1>(0);

  // Solutions -------------------------------------------------
  const meanVarSolution = useMemo(() => {
    if (points1D.length === 0) return null;
    const m = mean(points1D);
    const v = variance(points1D);
    return { mean: m, sd: Math.sqrt(v) };
  }, [points1D]);

  const linRegSolution = useMemo(() => solveLinearRegression(points2D), [points2D]);

  const kmeansSolution = useMemo(() => kMeans(kmeansPts, k), [kmeansPts, k]);

  const logRegSolution = useMemo(() => solveLogistic(logPts), [logPts]);

  // Coordinate helpers
  const toCanvasX = (x: number) => ((x + 3) / 6) * CANVAS_SIZE;
  const toCanvasY = (y: number) => CANVAS_SIZE - ((y + 3) / 6) * CANVAS_SIZE;
  const fromCanvas = (cx: number, cy: number) => {
    const x = (cx / CANVAS_SIZE) * 6 - 3;
    const y = -((cy / CANVAS_SIZE) * 6 - 3);
    return { x, y };
  };

  // Click handler to add points
  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rawCx = e.clientX - rect.left;
    const rawCy = e.clientY - rect.top;
    // Convert from actual SVG size to logical CANVAS_SIZE
    const cx = (rawCx / rect.width) * CANVAS_SIZE;
    const cy = (rawCy / rect.height) * CANVAS_SIZE;
    if (mode === "meanVariance") {
      const xVal = (cx / CANVAS_SIZE) * 6 - 3;
      setPoints1D([...points1D, xVal]);
    } else if (mode === "linearRegression") {
      const p = fromCanvas(cx, cy);
      setPoints2D([...points2D, p]);
    } else if (mode === "kMeans") {
      const p = fromCanvas(cx, cy);
      setKmeansPts([...kmeansPts, p]);
    } else if (mode === "logisticRegression") {
      const p = fromCanvas(cx, cy);
      setLogPts([...logPts, { ...p, label: logAddLabel }]);
    }
  };

  // Rendering helpers ----------------------------------------

  const renderPoints = () => {
    if (mode === "meanVariance") {
      return points1D.map((x, i) => <circle key={i} cx={toCanvasX(x)} cy={CANVAS_SIZE / 2} r={4} fill="#1e3a8a" />);
    }
    if (mode === "linearRegression") {
      return points2D.map((p, i) => <circle key={i} cx={toCanvasX(p.x)} cy={toCanvasY(p.y)} r={4} fill="#1e3a8a" />);
    }
    if (mode === "kMeans") {
      return kmeansPts.map((p, i) => {
        const cls = kmeansSolution.assignments[i];
        const colors = ["#ef4444", "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"];
        return <circle key={i} cx={toCanvasX(p.x)} cy={toCanvasY(p.y)} r={4} fill={colors[cls % colors.length]} />;
      });
    }
    if (mode === "logisticRegression") {
      return logPts.map((p, i) => (
        <circle key={i} cx={toCanvasX(p.x)} cy={toCanvasY(p.y)} r={5} fill={p.label === 0 ? "#dc2626" : "#2563eb"} />
      ));
    }
  };

  const renderSolutionOverlay = () => {
    if (mode === "meanVariance" && meanVarSolution) {
      const { mean: m, sd } = meanVarSolution;
      const cx = toCanvasX(m);
      const axisY = CANVAS_SIZE / 2;
      const sdPx = (sd / 6) * CANVAS_SIZE;
      const arrowY = axisY - 25;
      const startX = cx - sdPx;
      const endX = cx + sdPx;
      return (
        <>
          {/* mean marker */}
          <line x1={cx} y1={axisY - 6} x2={cx} y2={axisY + 6} stroke="#f59e0b" strokeWidth={3} />
          <foreignObject x={cx + 4} y={axisY - 20} width="60" height="20">
            <div className="text-xs text-amber-600">
              <InlineMath math={`\\mu = ${m.toFixed(2)}`} />
            </div>
          </foreignObject>

          {/* sigma indicator */}
          <line x1={startX} y1={arrowY} x2={endX} y2={arrowY} stroke="#f59e0b" strokeWidth={2} />
          {/* endpoints */}
          <line x1={startX} y1={arrowY - 4} x2={startX} y2={arrowY + 4} stroke="#f59e0b" strokeWidth={2} />
          <line x1={endX} y1={arrowY - 4} x2={endX} y2={arrowY + 4} stroke="#f59e0b" strokeWidth={2} />
          <foreignObject x={(startX + endX) / 2 - 30} y={arrowY - 16} width="60" height="20">
            <div className="text-xs text-amber-600 text-center">
              <InlineMath math={`\\sigma = ${(sd || 0).toFixed(2)}`} />
            </div>
          </foreignObject>
        </>
      );
    }
    if (mode === "linearRegression" && linRegSolution) {
      const { a, b } = linRegSolution;
      const x1 = -3,
        x2 = 3;
      const y1 = a * x1 + b;
      const y2 = a * x2 + b;
      return (
        <>
          <line
            x1={toCanvasX(x1)}
            y1={toCanvasY(y1)}
            x2={toCanvasX(x2)}
            y2={toCanvasY(y2)}
            stroke="#10b981"
            strokeWidth={2}
          />
          <foreignObject x={5} y={2} width="150" height="20">
            <div className="text-xs text-emerald-600">
              <InlineMath math={`y = ${a.toFixed(2)} x + ${b.toFixed(2)}`} />
            </div>
          </foreignObject>
        </>
      );
    }
    if (mode === "kMeans") {
      return kmeansSolution.centroids.map((c, idx) => (
        <g key={idx}>
          <circle cx={toCanvasX(c.x)} cy={toCanvasY(c.y)} r={6} fill="#000" />
          <foreignObject x={toCanvasX(c.x) + 8} y={toCanvasY(c.y) - 12} width="120" height="24">
            <div className="text-xs">
              <InlineMath math={`\\mu_{${idx + 1}} = [${c.x.toFixed(1)}, ${c.y.toFixed(1)}]`} />
            </div>
          </foreignObject>
        </g>
      ));
    }
    if (mode === "logisticRegression") {
      const { x: wx, y: wy, b } = logRegSolution;
      // decision boundary wx*x + wy*y + b = 0 => y = -(wx*x + b)/wy
      const x1 = -3,
        x2 = 3;
      const y1 = -(wx * x1 + b) / wy;
      const y2 = -(wx * x2 + b) / wy;

      // convert to lambda, theta, delta form
      const lambda = Math.sqrt(wx * wx + wy * wy);
      const thetaX = wx / (lambda || 1);
      const thetaY = wy / (lambda || 1);
      const delta = b / (lambda || 1);

      return (
        <>
          <line
            x1={toCanvasX(x1)}
            y1={toCanvasY(y1)}
            x2={toCanvasX(x2)}
            y2={toCanvasY(y2)}
            stroke="#000"
            strokeWidth={2}
          />
          <foreignObject x={5} y={CANVAS_SIZE - 25} width="300" height="20">
            <div className="text-xs">
              <InlineMath
                math={`\\lambda = ${lambda.toFixed(2)}, \\theta = (${thetaX.toFixed(2)}, ${thetaY.toFixed(2)}), \\delta = ${delta.toFixed(2)}`}
              />
            </div>
          </foreignObject>
        </>
      );
    }
    return null;
  };

  // JSX -------------------------------------------------------

  return (
    <div className="p-2 sm:p-4 bg-gray-50 rounded-lg space-y-4">
      {/* Mode selector and reset button */}
      <div className="flex justify-between items-center mx-auto max-w-md w-full">
        <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="border p-1 rounded">
          <option value="meanVariance">Mean & Variance</option>
          <option value="linearRegression">Linear Regression</option>
          <option value="kMeans">k-Means</option>
          <option value="logisticRegression">Logistic Regression</option>
        </select>
        <div className="flex items-center space-x-2">
          {/* k selector for k-means */}
          {mode === "kMeans" && (
            <div className="flex items-center space-x-1">
              <span className="text-sm">k=</span>
              <input
                type="number"
                min={2}
                max={5}
                value={k}
                onChange={(e) => setK(parseInt(e.target.value) || 3)}
                className="w-12 border p-1 rounded text-center"
              />
            </div>
          )}
          {/* Color toggle for logistic regression */}
          {mode === "logisticRegression" && (
            <button
              onClick={() => setLogAddLabel(logAddLabel === 0 ? 1 : 0)}
              className={`px-4 py-1 rounded text-white ${logAddLabel === 0 ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              Add {logAddLabel === 0 ? "Red" : "Blue"}
            </button>
          )}
          <button
            onClick={() => {
              if (mode === "meanVariance") setPoints1D([]);
              else if (mode === "linearRegression") setPoints2D([]);
              else if (mode === "kMeans") setKmeansPts([]);
              else if (mode === "logisticRegression") setLogPts([]);
            }}
            className="px-4 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex justify-center">
        <svg width="100%" height="auto" viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`} className="border bg-white max-w-md w-full" onClick={handleCanvasClick}>
        {/* Axes */}
        <line x1={0} y1={CANVAS_SIZE / 2} x2={CANVAS_SIZE} y2={CANVAS_SIZE / 2} stroke="#e5e7eb" />
        <line x1={CANVAS_SIZE / 2} y1={0} x2={CANVAS_SIZE / 2} y2={CANVAS_SIZE} stroke="#e5e7eb" />

          {renderPoints()}
          {renderSolutionOverlay()}
        </svg>
      </div>

      {/* Formulas */}
      <div className="space-y-3 text-sm">
        <div>
          <span className="font-semibold">Probabilistic model:</span>
          <div className="text-sm my-0">
            <NumberedMath displayMode={true} math={content[mode].model} />
          </div>
        </div>
        <div>
          <span className="font-semibold">Loss function:</span>
          <div className="text-sm my-0">
            <NumberedMath displayMode={true} math={content[mode].loss} />
          </div>
        </div>
      </div>

      {/* Explanation */}
      {showExplanations && <div className="prose max-w-none bg-white p-2 sm:p-4 rounded">{content[mode].explanation()}</div>}
    </div>
  );
}
