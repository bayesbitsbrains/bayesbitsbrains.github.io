import { join } from "path";
import "lodash";
import { contentDirectory } from "./config";
import { readFileSync, readdirSync } from "fs";
import { compileMDX } from "next-mdx-remote/rsc";
import React from "react";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { Cite, References } from "@/components/content/Citations";
import { Footnote } from "@/components/content/Footnotes";
import { Footnotes } from "@/components/content/Footnotes";
import { Tooltip } from "@/components/content/Tooltip";
import EvidenceAccumulationSimulator from "@/components/widgets/EvidenceAccumulationSimulator";
import CrossEntropySimulator from "@/components/widgets/CrossEntropySimulator";
import MaxEntropyVisualization from "@/components/widgets/MaxEntropyVisualization";
import FinanceImageSliderWidget from "@/components/widgets/FinanceSlider";
import FinanceSliderSP from "@/components/widgets/FinanceSliderSP";
import PollingErrorCalculator from "@/components/widgets/PollingErrorCalculator";
import DistributionConstraintBuilder from "@/components/widgets/DistributionConstraintBuilder";
import SoftmaxWidget from "@/components/widgets/SoftmaxWidget";
import LogisticWidget from "@/components/widgets/LogisticWidget";
import DistributionComparisonWidget from "@/components/widgets/DistributionComparisonWidget";
import EntropyWidget from "@/components/widgets/EntropyWidget";
import MultipleChoiceQuestion from "@/components/widgets/MultipleChoiceQuestion";
import ExpertRatingWidget from "@/components/widgets/ExpertRatingWidget";
import NoisyBinarySearchWidget from "@/components/widgets/NoisyBinarySearchWidget";
import MutualInformationWidget from "@/components/widgets/MutualInformationWidget";
import MWUWidget from "@/components/widgets/MWUWidget";
import FinancialDistributionWidget from "@/components/widgets/FinancialDistributionWidget";
import BayesCalculatorWidget from "@/components/widgets/BayesCalculatorWidget";
import BayesCalculatorLogWidget from "@/components/widgets/BayesCalculatorLogWidget";
import BayesSequenceWidget from "@/components/widgets/BayesSequenceWidget";
import BayesSequenceLogWidget from "@/components/widgets/BayesSequenceLogWidget";
import XKCDCountdownWidget from "@/components/widgets/XKCDCountdownWidget";
import CompressionWidget from "@/components/widgets/CompressionWidget";
import LLMCompressionProgressionWidget from "@/components/widgets/LLMCompressionProgressionWidget";
import MiniCompressionChart from "@/components/widgets/MiniCompressionChart";
import ShannonCodeWidget from "@/components/widgets/ShannonCodeWidget";
import KraftInequalityWidget from "@/components/widgets/KraftInequalityWidget";
import VolatilityDistributionWidget from "@/components/widgets/VolatilityDistributionWidget";
import HeartRateWidget from "@/components/widgets/CoinFlipWidget";
import GPT2CompressionWidget from "@/components/widgets/GPT2CompressionWidget";
import LetterPredictionWidget from "@/components/widgets/LetterPredictionWidget";
import { compile, evaluate } from "@mdx-js/mdx";
import chalk from "chalk";
import * as runtime from "react/jsx-runtime";
import KatexMath from "@/components/content/KatexMath";
import NumberedMath from "@/components/content/NumberedMath";
import EquationRef from "@/components/content/EquationRef";
import { EquationProvider } from "@/components/content/EquationContext";
import Block from "@/components/content/Block";
import Expand from "@/components/content/Expand";
import ExpandableImage from "@/components/content/ExpandableImage";
import MandelbrotExplorer from "@/components/widgets/MandelbrotExplorer";
import BuildYourOwnCodeWidget from "@/components/widgets/BuildYourOwnCodeWidget";
import CoinFlipRandomnessWidget from "@/components/widgets/CoinFlipRandomnessWidget";
import KLCalculatorWidget from "@/components/widgets/KLCalculatorWidget";
import KLAsymmetryVisualizerWidget from "@/components/widgets/KLAsymmetryVisualizerWidget";
import KLDivergenceSimplex from "@/components/widgets/KLDivergenceSimplex";
import BICModelSelectionWidget from "@/components/widgets/BICModelSelectionWidget";
import PolynomialRegressionWidget from "@/components/widgets/PolynomialRegressionWidget";
import ParametricCurveWidget from "@/components/widgets/ParametricCurveWidget";
import ProgrammingLanguageSimilarityWidget from "@/components/widgets/ProgrammingLanguageSimilarityWidget";
import UnifiedContentSimilarityWidget from "@/components/widgets/UnifiedContentSimilarityWidget";
import WikipediaContentSimilarityWidget from "@/components/widgets/WikipediaContentSimilarityWidget";
import ThreeCategoriesWidget from "@/components/widgets/ThreeCategoriesWidget";
import KeyTakeaway from "@/components/content/KeyTakeaway";
import RiddleSolution from "@/components/content/RiddleSolution";
import ImageGallery from "@/components/content/ImageGallery";
import Quote from "@/components/content/Quote";
import RiddleStatement from "@/components/content/RiddleStatement";
import RiddleExplanation from "@/components/content/RiddleExplanation";
import MLProblemExplorer from "@/components/widgets/MLProblemExplorer";
import MLProblemExplorerSimple from "@/components/widgets/MLProblemExplorerSimple";
import MDLink from "@/components/content/MDLink";
import SnippetDistributionTableWidget from "@/components/widgets/SnippetDistributionTableWidget";
import LnVsXGraph from "@/components/widgets/LnVsXGraph";
import DualActionImage from "@/components/content/DualActionImage";

// Force color support for CI/build environments
chalk.level = 3;

export async function getMdxContent(path: string) {
  const fullPath = join(contentDirectory, `${path}.mdx`);
  const source = readFileSync(fullPath, "utf-8");

  try {
    // Check if the file is valid MDX
    await compile(source);

    // const res = await evaluate(source, {
    //   ...runtime,
    //   // components: {
    //   //   Cite: Cite,
    //   //   References: References,
    //   //   Footnotes: Footnotes,
    //   //   Footnote: Footnote,
    //   //   EvidenceAccumulationSimulator: EvidenceAccumulationSimulator,
    //   // },
    //   baseUrl: import.meta.url,
    //   remarkPlugins: [
    //     remarkGfm, // GitHub Flavored Markdown
    //     remarkMath, // Math equations
    //   ],
    //   rehypePlugins: [
    //     [
    //       rehypeKatex,
    //       {
    //         macros: {
    //           "\\R": "\\mathbb{R}",
    //           "\\eps": "\\varepsilon",
    //         },
    //         trust: true,
    //       },
    //     ], // KaTeX for math rendering
    //     rehypeHighlight, // Syntax highlighting
    //   ],
    //   // development: true,
    // });
    // return res.default({});
  } catch (error) {
    const mdxError = error as any;
    const lineNumber = mdxError.line || mdxError.cause?.loc?.line;
    const column = mdxError.column || mdxError.cause?.loc?.column;
    const reason = mdxError.reason || mdxError.message;

    // Get the problematic line and surrounding context
    const lines = source.split("\n");

    // Create a context snippet with line numbers
    const startLine = Math.max(1, lineNumber - 2);
    const endLine = Math.min(lines.length, lineNumber + 2);
    const snippet = [];

    // Find the line number width for proper padding
    const lineNumWidth = String(endLine).length;

    // Check if this might be a curly brace issue in LaTeX
    const errorLine = lines[lineNumber - 1] || "";
    const hasCurlyBeforeError = column > 0 && errorLine.substring(0, column).includes("{");

    for (let i = startLine - 1; i < endLine; i++) {
      const isErrorLine = i === lineNumber - 1;
      const lineNum = String(i + 1).padStart(lineNumWidth, " ");

      if (isErrorLine) {
        // Add the error line in red
        snippet.push(chalk.gray(`${lineNum}|`) + " " + chalk.red(lines[i]));

        // Create the error marker line with precise alignment
        const errorPointer = " ".repeat(Math.max(0, column - 1)) + chalk.bold.red("^");
        snippet.push(chalk.gray(" ".repeat(lineNumWidth) + "|") + " " + errorPointer);
      } else {
        snippet.push(chalk.gray(`${lineNum}|`) + " " + lines[i]);
      }
    }

    let errorOutput =
      "\n" +
      chalk.bold.red(`Error parsing MDX file: ${path}.mdx\n`) +
      chalk.yellow(`${reason} at line ${lineNumber}${column ? `, column ${column}` : ""}\n\n`) +
      snippet.join("\n");

    // Add helpful hint for curly brace issues
    if (hasCurlyBeforeError) {
      errorOutput +=
        "\n\n" +
        chalk.cyan(
          "Hint: Unlike plain MD, MDX uses {...} for JSX expressions. To get literal curly braces, use \\{ and \\}",
        );
    }

    console.error(errorOutput + "\n");

    throw new Error(`Failed to compile MDX: ${reason}`);
  }

  const { content } = await compileMDX({
    source,
    components: {
      Cite: Cite,
      References: References,
      Footnotes: Footnotes,
      Footnote: Footnote,
      Tooltip: Tooltip,
      EvidenceAccumulationSimulator: EvidenceAccumulationSimulator,
      CrossEntropySimulator: CrossEntropySimulator,
      MaxEntropyVisualization: MaxEntropyVisualization,
      FinanceImageSliderWidget: FinanceImageSliderWidget,
      FinanceSliderSP: FinanceSliderSP,
      PollingErrorCalculator: PollingErrorCalculator,
      DistributionConstraintBuilder: DistributionConstraintBuilder,
      SoftmaxWidget: SoftmaxWidget,
      LogisticWidget: LogisticWidget,
      DistributionComparisonWidget: DistributionComparisonWidget,
      EntropyWidget: EntropyWidget,
      MultipleChoiceQuestion: MultipleChoiceQuestion,
      ExpertRatingWidget: ExpertRatingWidget,
      NoisyBinarySearchWidget: NoisyBinarySearchWidget,
      MutualInformationWidget: MutualInformationWidget,
      MWUWidget: MWUWidget,
      FinancialDistributionWidget: FinancialDistributionWidget,
      BayesCalculatorWidget: BayesCalculatorWidget,
      BayesCalculatorLogWidget: BayesCalculatorLogWidget,
      BayesSequenceWidget: BayesSequenceWidget,
      BayesSequenceLogWidget: BayesSequenceLogWidget,
      XKCDCountdownWidget: XKCDCountdownWidget,
      CompressionWidget: CompressionWidget,
      LLMCompressionProgressionWidget: LLMCompressionProgressionWidget,
      MiniCompressionChart: MiniCompressionChart,
      ShannonCodeWidget: ShannonCodeWidget,
      KraftInequalityWidget: KraftInequalityWidget,
      VolatilityDistributionWidget: VolatilityDistributionWidget,
      CoinFlipWidget: HeartRateWidget,
      HeartRateWidget: HeartRateWidget,
      MandelbrotExplorer: MandelbrotExplorer,
      BuildYourOwnCodeWidget: BuildYourOwnCodeWidget,
      CoinFlipRandomnessWidget: CoinFlipRandomnessWidget,
      KLCalculatorWidget: KLCalculatorWidget,
      KLAsymmetryVisualizerWidget: KLAsymmetryVisualizerWidget,
      KLDivergenceSimplex: KLDivergenceSimplex,
      BICModelSelectionWidget: BICModelSelectionWidget,
      PolynomialRegressionWidget: PolynomialRegressionWidget,
      ParametricCurveWidget: ParametricCurveWidget,
      ProgrammingLanguageSimilarityWidget: ProgrammingLanguageSimilarityWidget,
      UnifiedContentSimilarityWidget: UnifiedContentSimilarityWidget,
      WikipediaContentSimilarityWidget: WikipediaContentSimilarityWidget,
      ThreeCategoriesWidget: ThreeCategoriesWidget,
      LnVsXGraph: LnVsXGraph,
      DualActionImage: DualActionImage,
      GPT2CompressionWidget: GPT2CompressionWidget,
      LetterPredictionWidget: LetterPredictionWidget,
      SnippetDistributionTableWidget: SnippetDistributionTableWidget,
      MLProblemExplorer: MLProblemExplorer,
      MLProblemExplorerSimple: MLProblemExplorerSimple,
      GaussianFitWidget: (await import("@/components/widgets/GaussianFitWidget")).default,
      Math: NumberedMath,
      EqRef: EquationRef,
      Block: Block,
      Example: Block,
      Expand: Expand,
      KeyTakeaway: KeyTakeaway,
      RiddleSolution: RiddleSolution,
      ImageGallery: ImageGallery,
      Quote: Quote,
      img: ExpandableImage,
      RiddleStatement: RiddleStatement,
      RiddleExplanation: RiddleExplanation,
      a: MDLink,
    },
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [
          remarkGfm, // GitHub Flavored Markdown
          remarkMath, // Math equations
        ],
        rehypePlugins: [
          [
            rehypeKatex,
            {
              macros: {
                "\\R": "\\mathbb{R}",
                "\\eps": "\\varepsilon",
              },
              trust: true,
            },
          ], // KaTeX for math rendering
          rehypeHighlight, // Syntax highlighting
        ],
        development: true,
      },
    },
  });

  return content;
}

export function getAllMdxPaths() {
  const files = readdirSync(contentDirectory);
  return files.filter((file) => file.endsWith(".mdx")).map((file) => file.replace(/\.mdx$/, ""));
}
