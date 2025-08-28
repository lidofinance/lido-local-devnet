/* eslint-disable no-bitwise */
import chalk from "chalk";

export const applyColor = (color: string, text: string) =>
  chalk.hex(color)(text);

export const getColorForText = (text: string): string => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    // eslint-disable-next-line unicorn/prefer-code-point
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }

  const color = `#${((hash >> 24) & 0xff).toString(16).padStart(2, "0")}${(
    (hash >> 16) &
    0xff
  )
    .toString(16)
    .padStart(2, "0")}${((hash >> 8) & 0xff).toString(16).padStart(2, "0")}`;
  return color;
};

const colorCache: { [key: string]: string } = {};

export const getCachedColor = (text: string): string => {
  if (!colorCache[text]) {
    colorCache[text] = getColorForText(text);
  }

  return colorCache[text];
};

export const transformCMDOutput = async function* (
  color: string,
  separator: string,
  chunk: any,
) {
  yield `${getSeparator(color, separator)} ${chunk}`;
};

export const getSeparator = (color: string, separator: string) => `${chalk.hex(color)(`${separator}`)}`;
