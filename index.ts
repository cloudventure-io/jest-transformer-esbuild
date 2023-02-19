import * as babel from "@babel/core";
import {
  AsyncTransformer,
  SyncTransformer,
  TransformOptions,
  TransformedSource,
  Transformer,
  TransformerCreator,
} from "@jest/transform";
import * as esbuild from "esbuild";
import { globsToMatcher } from "jest-util";
import { extname } from "path";

export interface TransformerConfig {
  format?: "esm" | "cjs";
  hoistMatch?: Array<string>;
}

export type EsbuildTransformOptions = TransformOptions<TransformerConfig>;

const nodeMajorVersion = process.version.match(/^v(\d+)\./)?.[1];

const esbuildOptions: esbuild.TransformOptions = {
  sourcemap: "inline",
  legalComments: "inline",
  platform: "node",
  target: nodeMajorVersion ? `node${nodeMajorVersion}` : undefined,
};

const babelOptions: babel.TransformOptions = {
  plugins: ["jest-hoist"],
  sourceMaps: "inline",
  configFile: false,
};

const loaders: Array<esbuild.Loader> = ["ts", "tsx", "js"];
const getLoader = (path: string): esbuild.Loader => {
  const ext = extname(path) as esbuild.Loader;
  return loaders.includes(ext) ? ext : "default";
};

const handleResult = (
  esbuildResult: esbuild.TransformResult,
  babelResult: babel.BabelFileResult | null | undefined
): TransformedSource => {
  let result: TransformedSource;

  if (babelResult === undefined) {
    result = {
      code: esbuildResult.code,
      map: esbuildResult.map,
    };
  } else if (
    babelResult === null ||
    babelResult.code === null ||
    babelResult.code === undefined
  ) {
    throw new Error(`babel transform returned empty result`);
  } else {
    result = {
      code: babelResult.code,
      map: babelResult.map,
    };
  }

  return {
    code: result.code.replace(/\/\*!(\s*istanbul ignore .*?)\*\//, "/* $1*/"),
    map: result.map,
  };
};

const matcher = (path: string, options: EsbuildTransformOptions): boolean =>
  globsToMatcher(
    options?.transformerConfig?.hoistMatch || options.config.testMatch
  )(path);

const createTransformer: TransformerCreator<
  Transformer<TransformerConfig>,
  TransformerConfig
> = (): SyncTransformer<TransformerConfig> &
  AsyncTransformer<TransformerConfig> => {
  return {
    process(source: string, path: string, options: EsbuildTransformOptions) {
      const esbuildResult = esbuild.transformSync(source, {
        ...esbuildOptions,
        sourcefile: path,
        format: options?.transformerConfig?.format || "cjs",
        loader: getLoader(path),
      });

      let babelResult: babel.BabelFileResult | null | undefined;

      if (matcher(path, options)) {
        babelResult = babel.transformSync(esbuildResult.code, babelOptions);
      }

      return handleResult(esbuildResult, babelResult);
    },

    async processAsync(
      source: string,
      path: string,
      options: EsbuildTransformOptions
    ) {
      const esbuildResult = await esbuild.transform(source, {
        ...esbuildOptions,
        sourcefile: path,
        format: options?.transformerConfig?.format || "esm",
        loader: getLoader(path),
      });

      let babelResult: babel.BabelFileResult | null | undefined;

      if (matcher(path, options)) {
        babelResult = await babel.transformAsync(
          esbuildResult.code,
          babelOptions
        );
      }

      return handleResult(esbuildResult, babelResult);
    },
  };
};

export default { createTransformer };
