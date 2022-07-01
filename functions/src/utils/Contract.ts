import {
  Minter__factory,
  Rewarder__factory,
  SybelInternalTokens__factory,
  TokenSybelEcosystem__factory,
  Minter__factory,
} from "../generated-types";
import { ethers, Wallet } from "ethers";
import {
  rewarderAddr,
  tseTokenAddr,
  minterAddr,
  fractionCostBadgesAddr,
  internalTokenAddr,
} from "./addresses.json";
import { FractionCostBadges__factory } from "../generated-types/factories/FractionCostBadges__factory";
import { FractionCostBadges } from "../generated-types/FractionCostBadges";

// Build our provider
const provider = new ethers.providers.JsonRpcProvider(
  process.env.HARDHAT_LOCAL_NODE
);

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

export async function fractionCostBadgesConnected(): Promise<FractionCostBadges> {
  const sybelWallet = new Wallet(
    process.env.HARDHAT_LOCAL_TEST_WALLET!,
    provider
  );
  return FractionCostBadges__factory.connect(
    fractionCostBadgesAddr,
    sybelWallet
  );
}

//  Access our minter contract with a test wallet
// TODO : Replace this wallet with the sybel wallet witch will pay gas fee
export const getMinterConnected = () =>
  Minter__factory.connect(
    minterAddr,
    new ethers.Wallet(process.env.HARDHAT_TEST_WALLET!, provider)
  );
