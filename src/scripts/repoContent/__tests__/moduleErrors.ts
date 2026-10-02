import ts from 'typescript';

/**
 * TypeScript's own verdict on some modules held in memory: each file's
 * syntax and binder errors, as `tsc -b` would report them.
 *
 * The writer's round-trip check parses a file but never binds it, and some
 * mistakes only the binder sees: `export const static: Song` parses, and
 * only then is `static` a reserved word in a module. So the tests that
 * prove a written file will compile ask the compiler itself.
 *
 * No lib is loaded, which keeps a check to milliseconds and leaves out type
 * errors about globals; those land in the program's global diagnostics,
 * which this does not read. Imports between the given files resolve.
 * `ignore` drops codes a caller expects, such as 2307 for an import of a
 * file it did not give, or 2304 for a global type like `Record`.
 */
export function moduleErrors(
  files: Record<string, string>,
  ignore: readonly number[] = [],
): string[] {
  const options: ts.CompilerOptions = {
    noLib: true,
    types: [],
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  };
  const host: ts.CompilerHost = {
    getSourceFile: (name, target) =>
      name in files
        ? ts.createSourceFile(name, files[name], target, true)
        : undefined,
    getDefaultLibFileName: () => '/lib.d.ts',
    writeFile: () => {},
    getCurrentDirectory: () => '/',
    getCanonicalFileName: (name) => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: (name) => name in files,
    readFile: (name) => files[name],
  };
  const program = ts.createProgram(Object.keys(files), options, host);
  const errors: string[] = [];
  for (const name of Object.keys(files)) {
    const sourceFile = program.getSourceFile(name);
    if (!sourceFile) throw new Error(`${name} was not loaded`);
    for (const diagnostic of [
      ...program.getSyntacticDiagnostics(sourceFile),
      ...program.getSemanticDiagnostics(sourceFile),
    ]) {
      if (ignore.includes(diagnostic.code)) continue;
      errors.push(
        `${name}: TS${diagnostic.code} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`,
      );
    }
  }
  return errors;
}
