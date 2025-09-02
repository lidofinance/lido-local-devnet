import { z } from "zod";

import { Path } from "./path.js";

/**
 *  ArtifactRoot = <project root>/artifacts/
 *  NetworkArtifactRoot = <project root>/<network name>/
 *  ServiceArtifactRoot = <project root>/<network name>/<service>
 *  ChainRoot = <project root>/<network name>/<service that provides chain data>/
 */

export const ArtifactRootBrand = Symbol('ArtifactRoot');
export const ChainRootBrand = Symbol('ChainRootBrand');
export const NetworkArtifactRootBrand = Symbol('NetworkArtifactRootBrand');
export const ServiceArtifactRootBrand = Symbol('ServiceArtifactRootBrand');

export const ArtifactRoot = Path.brand(ArtifactRootBrand);
export type ArtifactRoot = z.infer<typeof ArtifactRoot>;

export const NetworkArtifactRoot = Path.brand(NetworkArtifactRootBrand);
export type NetworkArtifactRoot = z.infer<typeof NetworkArtifactRoot>;

export const ServiceArtifactRoot = Path.brand(ServiceArtifactRootBrand);
export type ServiceArtifactRoot = z.infer<typeof ServiceArtifactRoot>;

export const ChainRoot = Path.brand(ChainRootBrand);
export type ChainRoot = z.infer<typeof ChainRoot>;
