// This script can be used to deploy the "PodcastHandler" contract using Web3 library.
import { ethers, upgrades } from "hardhat";

import { Contract } from "ethers";

import { SybelInternalTokens } from "../typechain-types/contracts/tokens/SybelInternalTokens";
import { SybelMediaToken } from "../typechain-types/contracts/tokens/SybelMediaToken";
import { TokenSybelEcosystem } from "../typechain-types/contracts/tokens/TokenSybelEcosystem";
import { ListenerBadges } from "../typechain-types/contracts/badges/payment/ListenerBadges";
import { PodcastBadges } from "../typechain-types/contracts/badges/payment/PodcastBadges";
import { FractionCostBadges } from "../typechain-types/contracts/badges/cost/FractionCostBadges";
import { Minter } from "../typechain-types/contracts/minter/Minter";
import { Updater } from "../typechain-types/contracts/updater/Updater";
import { Rewarder } from "../typechain-types/contracts/reward/Rewarder";
import { SybelRoles } from "../typechain-types/contracts/utils/SybelRoles";

(async () => {
  try {
    console.log(
      "Deploying all the contract for a simple blockchain intergration"
    );

    // Deploy our roles libs (just use to access the roles, not really needed)
    const SybelRolesFactory = await ethers.getContractFactory("SybelRoles");
    const sybelRoles = (await SybelRolesFactory.deploy()) as SybelRoles;
    console.log("Sybel roles deployed to " + sybelRoles.address);

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
    console.log("Listener badges deployed to " + listenerBadges.address);
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

    // Deploy our updater contract
    const updater = await deployContract<Updater>("Updater", [
      listenerBadges.address,
      podcastBadges.address,
    ]);
    console.log("Updater deployed to " + updater.address);

    // Deploy our minter contract
    const minter = await deployContract<Minter>("Minter", [
      tseToken.address,
      internalToken.address,
      listenerBadges.address,
      podcastBadges.address,
      factionCostBadges.address,
    ]);
    console.log("Minter deployed to " + minter.address);

    // Set the updater address on the internal tokens
    await internalToken.updateUpdaterAddr(updater.address);

    // Grand all the minting roles
    await internalToken.grantRole(sybelRoles.MINTER(), minter.address);
    await internalToken.grantRole(sybelRoles.MINTER(), rewarder.address);
    await tseToken.grantRole(sybelRoles.MINTER(), minter.address);
    await tseToken.grantRole(sybelRoles.MINTER(), rewarder.address);

    // Grand the badges updater roles
    await updater.grantRole(sybelRoles.BADGE_UPDATER(), internalToken.address);
    await listenerBadges.grantRole(sybelRoles.BADGE_UPDATER(), updater.address);
    await podcastBadges.grantRole(sybelRoles.BADGE_UPDATER(), updater.address);
    await podcastBadges.grantRole(sybelRoles.BADGE_UPDATER(), rewarder.address); // The rewarder has this role since he update the badges on each listen payment
    console.log("All roles granted with success");
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

function generateRandomListenCountArray(podcastIdsCount: number): number[] {
  return [...Array(podcastIdsCount).keys()].map((_) => {
    return getRandomInt();
  });
}

function getRandomInt(): number {
  const min = Math.ceil(1);
  const max = Math.floor(20);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
