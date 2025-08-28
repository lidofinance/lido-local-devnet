import chalk from "chalk";

export const applyColor = (color: string, text: string) =>
  chalk.hex(color)(text);

export const getColorForText = (text: string): string => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    // eslint-disable-next-line unicorn/prefer-code-point,no-bitwise
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }

  // eslint-disable-next-line unicorn/prefer-code-point,no-bitwise
  const color = `#${((hash >> 24) & 0xff).toString(16).padStart(2, "0")}${(
    (hash >> 16) &
    0xff
  )
    .toString(16)
    .padStart(2, "0")}${((hash >> 8) & 0xff).toString(16).padStart(2, "0")}`;
  return color;
};
