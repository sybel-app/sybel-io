import {
  Minter__factory,
  Rewarder__factory,
  SybelInternalTokens__factory,
  TokenSybelEcosystem__factory,
} from "../generated-types";
import { ethers } from "ethers";
import {
  rewarderAddr,
  tseTokenAddr,
  minterAddr,
  fractionCostBadgesAddr,
  internalTokenAddr,
} from "./addresses.json";
import { FractionCostBadges__factory } from "../generated-types/factories/FractionCostBadges__factory";

// Build our provider
const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545/");

// Access our tse token contract
export const tseToken = TokenSybelEcosystem__factory.connect(
  tseTokenAddr,
  provider
);

// Access our internal token contract
export const internalTokens = SybelInternalTokens__factory.connect(
  internalTokenAddr,
  provider
);

// Access our rewarded contract
export const rewarder = Rewarder__factory.connect(rewarderAddr, provider);

// Access our minter contract
export const minter = Minter__factory.connect(minterAddr, provider);

// Access our fraction badge contract
export const fractionCostBadges = FractionCostBadges__factory.connect(
  fractionCostBadgesAddr,
  provider
);
