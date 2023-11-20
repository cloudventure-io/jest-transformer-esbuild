import * as esbuild from "esbuild";
import typescript from "typescript";

const run = async () => {
  const esbuildOptions: esbuild.BuildOptions = {
    platform: "node",
    bundle: false,
    entryPoints: ["index.ts"],
    sourcemap: "external",
    minify: true,
    keepNames: true,
    legalComments: "external",
  };

  await Promise.all([
    esbuild.build({
      ...esbuildOptions,
      outfile: "dist/index.js",
      format: "cjs",
    }),
    esbuild.build({
      ...esbuildOptions,
      outfile: "dist/index.mjs",
      format: "esm",
    }),
  ]);

  const program = typescript.createProgram(["index.ts"], {
    declaration: true,
    emitDeclarationOnly: true,
    declarationDir: "dist",
    target: typescript.ScriptTarget.ES2020,
    skipLibCheck: true,
    types: ["node"],
    moduleResolution: typescript.ModuleResolutionKind.NodeJs,
  });

  const emitResult = program.emit();
  const allDiagnostics = typescript
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  allDiagnostics.forEach((diagnostic) => {
    if (diagnostic.file) {
      const { line, character } = typescript.getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start!
      );
      const message = typescript.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n"
      );
      console.error(
        `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
      );
    } else {
      console.error(
        typescript.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
      );
    }
  });
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
