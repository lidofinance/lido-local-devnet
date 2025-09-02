import { z } from "zod";

export const PathBrand = Symbol('PathBrand');

export const Path = z.string().brand(PathBrand);
export type Path = z.infer<typeof Path>;
