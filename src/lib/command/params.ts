import { Flags } from "@oclif/core";
// Interfaces.LoadOptions
// https://github.com/oclif/core/blob/036981f97e0f8d913f800d3181c27bcd6f672208/src/config/config.ts#L359
function wrapWithAdditionalFields<T extends (...args: any[]) => any>(
  originalFunction: T,
  additionalFields: Record<string, any>,
): (...funcArgs: Parameters<T>) => ReturnType<T> & Record<string, any> {
  return (...args: Parameters<T>) => {
    const result = originalFunction(...args);
    return {
      ...result,
      ...additionalFields,
    };
  };
}

export const boolean = wrapWithAdditionalFields(Flags.boolean, {
  paramParserType: "boolean",
}) as typeof Flags.boolean;

export const string = wrapWithAdditionalFields(Flags.string, {
  paramParserType: "string",
}) as typeof Flags.string;

export const integer = wrapWithAdditionalFields(Flags.integer, {
  paramParserType: "integer",
}) as typeof Flags.integer;
