import { z } from "zod";

export const NetworkBrand = Symbol('NetworkBrand');

export const DEFAULT_NETWORK_NAME = process.env.DEVNET_NAME ?? 'my-devnet';

/**
 *  Unique name of the devnet network
 *  @see DEFAULT_NETWORK_NAME
 */
export const Network = z.string().brand(NetworkBrand);
export type Network = z.infer<typeof Network>;
