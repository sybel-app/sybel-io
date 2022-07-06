// This script can be used to deploy the "PodcastHandler" contract using Web3 library.
import { ethers, upgrades } from "hardhat";
import * as fs from "fs";

const hre = require("hardhat");

import { Contract, utils } from "ethers";

import { SybelInternalTokens } from "../typechain-types/contracts/tokens/SybelInternalTokens";
import { SybelMediaToken } from "../typechain-types/contracts/tokens/SybelMediaToken";
import { TokenSybelEcosystem } from "../typechain-types/contracts/tokens/TokenSybelEcosystem";
import { ListenerBadges } from "../typechain-types/contracts/badges/payment/ListenerBadges";
import { PodcastBadges } from "../typechain-types/contracts/badges/payment/PodcastBadges";
import { FractionCostBadges } from "../typechain-types/contracts/badges/cost/FractionCostBadges";
import { Minter } from "../typechain-types/contracts/minter/Minter";
import { Rewarder } from "../typechain-types/contracts/reward/Rewarder";
import { util } from "chai";

(async () => {
  try {
    console.log(
      "Deploying all the contract for a simple blockchain intergration"
    );

    // Deploy our internal token contract
    const internalToken = await deployContract<SybelInternalTokens>(
      "SybelInternalTokens"
    );
    console.log("Internal tokens deployed to " + internalToken.address);

    // Deploy our tse token contract
    const tseToken = await deployContract<TokenSybelEcosystem>(
      "TokenSybelEcosystem"
    );
    console.log("TSE token deployed to " + tseToken.address);

    // Deploy our smt token contract
    const smtToken = await deployContract<SybelMediaToken>("SybelMediaToken");
    console.log("SMT token deployed to " + smtToken.address);

    // Deploy our listener and podcast badges contract
    const listenerBadges = await deployContract<ListenerBadges>(
      "ListenerBadges"
    );
    console.log("Listener badges deployed to " + listenerBadges.address);
    const podcastBadges = await deployContract<PodcastBadges>("PodcastBadges");
    console.log("Podcast badges deployed to " + podcastBadges.address);
    const factionCostBadges = await deployContract<FractionCostBadges>(
      "FractionCostBadges"
    );
    console.log("Fraction badges deployed to " + factionCostBadges.address);

    // Deploy our rewarder contract
    const rewarder = await deployContract<Rewarder>("Rewarder", [
      tseToken.address,
      internalToken.address,
      listenerBadges.address,
      podcastBadges.address,
    ]);
    console.log("Rewarder deployed to " + rewarder.address);

    // Deploy our minter contract
    const minter = await deployContract<Minter>("Minter", [
      tseToken.address,
      internalToken.address,
      listenerBadges.address,
      podcastBadges.address,
      factionCostBadges.address,
    ]);
    console.log("Minter deployed to " + minter.address);

    // Grand all the minting roles
    const minterRole = utils.keccak256(utils.toUtf8Bytes("MINTER_ROLE"));
    await internalToken.grantRole(minterRole, minter.address);
    await internalToken.grantRole(minterRole, rewarder.address);
    await tseToken.grantRole(minterRole, minter.address);
    await tseToken.grantRole(minterRole, rewarder.address);

    console.log("All roles granted with success");

    // Build our deplyoed address object
    const addresses = new DeployedAddress(
      internalToken.address,
      tseToken.address,
      smtToken.address,
      listenerBadges.address,
      podcastBadges.address,
      factionCostBadges.address,
      rewarder.address,
      minter.address
    );
    fs.writeFileSync("addresses.json", addresses.toJson());
    // Write another addresses with the name of the current network as backup
    fs.writeFileSync(
      `addresses-${hre.hardhatArguments.network}.json`,
      addresses.toJson()
    );
  } catch (e: any) {
    console.log(e.message);
  }
})();

async function deployContract<Type extends Contract>(
  name: string,
  args?: unknown[]
): Promise<Type> {
  const contractFactory = await ethers.getContractFactory(name);
  const contract = (await upgrades.deployProxy(contractFactory, args, {
    kind: "uups",
  })) as Type;
  await contract.deployed();
  return contract;
}

// Immutable data object
class DeployedAddress {
  constructor(
    readonly internalTokenAddr: String,
    readonly tseTokenAddr: String,
    readonly smtTokenAddr: String,
    readonly listenBadgesAddr: String,
    readonly podcastBadgesAddr: String,
    readonly fractionCostBadgesAddr: String,
    readonly rewarderAddr: String,
    readonly minterAddr: String
  ) {}

  toJson(): string {
    return JSON.stringify(this);
  }
}
