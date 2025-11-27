import { ArtifactRoot } from "@devnet/types";
import path from "node:path";

// TODO what if process.cwd() is not the root of the project?
export const ARTIFACTS_ROOT: ArtifactRoot = ArtifactRoot.parse(path.join(process.cwd(), "artifacts"));
