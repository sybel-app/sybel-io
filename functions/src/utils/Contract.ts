import {
  Rewarder__factory,
  TokenSybelEcosystem__factory,
  Minter__factory,
} from "../generated-types";
import { ethers } from "ethers";
import { rewarderAddr, tseTokenAddr, minterAddr } from "./addresses.json";

// Build our provider
const provider = new ethers.providers.JsonRpcProvider(
  process.env.HARDHAT_LOCAL_NODE
);

// Access our tse token contract
export const tseToken = TokenSybelEcosystem__factory.connect(
  tseTokenAddr,
  provider
);

// Access our rewarded contract
export const rewarder = Rewarder__factory.connect(rewarderAddr, provider);

//  Access our minter contract with a test wallet
// TODO : Replace this wallet with the sybel wallet witch will pay gas fee
export const getMinterConnected = () =>
  Minter__factory.connect(
    minterAddr,
    new ethers.Wallet(process.env.HARDHAT_TEST_WALLET!, provider)
  );
