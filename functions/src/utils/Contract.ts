import {
  Rewarder__factory,
  TokenSybelEcosystem__factory,
} from "../generated-types";
import { ethers } from "ethers";
import { rewarderAddress, tseAddress } from "./addresses";

// Build our provider
const provider = new ethers.providers.JsonRpcProvider(process.env.SYBEL);

// Access our tse token contract
export const tseToken = TokenSybelEcosystem__factory.connect(
  tseAddress,
  provider
);

// Access our rewarded contract
export const rewarder = Rewarder__factory.connect(rewarderAddress, provider);
