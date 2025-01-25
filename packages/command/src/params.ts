import { Flags } from "@oclif/core";
import { z } from "zod";
// Interfaces.LoadOptions
// https://github.com/oclif/core/blob/036981f97e0f8d913f800d3181c27bcd6f672208/src/config/config.ts#L359
function wrapWithAdditionalFields<T extends (...args: any[]) => any>(
  originalFunction: T,
  additionalFields: Record<string, any>,
): (...funcArgs: Parameters<T>) => Record<string, any> & ReturnType<T> {
  return (...args: Parameters<T>) => {
    const result = originalFunction(...args);
    return {
      ...result,
      ...additionalFields,
    };
  };
}

type ParamsParseOps = {
  allowNo: boolean;
  char?: "n";
  key: string;
  paramParserType: keyof typeof ParamSchemas;
  required: boolean;
  summary: string;
  type: "string";
};

// const booleanParamSchema = z.boolean();
// const stringParamSchema = z.string();
// const integerParamSchema = z.number();

export const ParamSchemas = {
  boolean: z.boolean(),
  string: z.string(),
  number: z.number(),
};

const paramParser = async (value: unknown, opts: ParamsParseOps) => {
  const schema = ParamSchemas[opts.paramParserType];
  if (!schema)
    throw new Error(
      `Schema params parser not found for type ${opts.paramParserType} with key ${opts.key}`,
    );

  if (!opts.required) {
    return schema.optional().parseAsync(value);
  }

  return schema.parseAsync(value);
};

export const boolean = wrapWithAdditionalFields(Flags.boolean, {
  paramParserType: "boolean",
  paramParser,
}) as typeof Flags.boolean;

export const string = wrapWithAdditionalFields(Flags.string, {
  paramParserType: "string",
  paramParser
}) as typeof Flags.string;

export const integer = wrapWithAdditionalFields(Flags.integer, {
  paramParserType: "integer",
  paramParser
}) as typeof Flags.integer;
