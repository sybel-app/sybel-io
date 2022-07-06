import {
  Minter,
  Minter__factory,
  Rewarder__factory,
  SybelInternalTokens__factory,
  TokenSybelEcosystem__factory,
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
import { decryptJsonWallet } from "@ethersproject/json-wallets";

// Build our provider
const provider = new ethers.providers.JsonRpcProvider(
  process.env.JSON_RPC_PROVIDER_URL
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

// Access the sybel private wallet
async function sybelWallet(): Promise<Wallet> {
  // Decrypt the sybel key from the env variable
  const account = await decryptJsonWallet(
    process.env.SYBEL_ENCRYPTED_WALLET!,
    process.env.SYBEL_ENCRYPTION_KEY!
  );
  // Build the wallet
  return new Wallet(account, provider);
}

// Access our fraction cost badge contract, connected on the sybe lwallet
export async function fractionCostBadgesConnected(): Promise<FractionCostBadges> {
  const wallet = await sybelWallet();
  return FractionCostBadges__factory.connect(fractionCostBadgesAddr, wallet);
}

// Access our fraction cost badge contract, connected on the sybe lwallet
export async function minterConnected(): Promise<Minter> {
  const sybelWallet = new Wallet(
    process.env.HARDHAT_LOCAL_TEST_WALLET!,
    provider
  );
  return Minter__factory.connect(minterAddr, sybelWallet);
}
