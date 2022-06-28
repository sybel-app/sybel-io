// This script can be used to deploy the "PodcastHandler" contract using Web3 library.
import { ethers, upgrades } from "hardhat";

import { Bytes, Contract } from "ethers";

const hre = require("hardhat");

import { SybelInternalTokens } from "../typechain-types/contracts/tokens/SybelInternalTokens";
import { SybelMediaToken } from "../typechain-types/contracts/tokens/SybelMediaToken";
import { TokenSybelEcosystem } from "../typechain-types/contracts/tokens/TokenSybelEcosystem";
import { ListenerBadges } from "../typechain-types/contracts/badges/payment/ListenerBadges";
import { PodcastBadges } from "../typechain-types/contracts/badges/payment/PodcastBadges";
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
    ]);
    console.log("Minter deployed to " + updater.address);

    // Set the updater address on the internal tokens
    await internalToken.updateUpdaterAddr(updater.address);

    // Grand all the minting roles
    await internalToken.grantRole(sybelRoles.MINTER(), minter.address);
    await internalToken.grantRole(sybelRoles.MINTER(), rewarder.address);
    await tseToken.grantRole(sybelRoles.MINTER(), minter.address);
    await tseToken.grantRole(sybelRoles.MINTER(), rewarder.address);

    // Grand the badges updater roles
    await updater.grantRole(sybelRoles.BADGE_UPDATER(), internalToken.address);
    await podcastBadges.grantRole(sybelRoles.BADGE_UPDATER(), updater.address);
    await listenerBadges.grantRole(sybelRoles.BADGE_UPDATER(), updater.address);
    console.log("All roles granted with success");

    // Get the 5 first accounts
    const accounts = (await hre.ethers.getSigners()).slice(0, 5);

    // Listen on podcast mint event
    const podcastMintEventFilter = minter.filters.PodcastMinted();
    minter.on(podcastMintEventFilter, async (_podcastId) => {
      console.log("New podcast minted with id " + _podcastId);
      // Pay some random listening time on each account
      /*for (const account of accounts) {
        await rewarder.payUser(account.address, [_podcastId], [3]);
        console.log(
          "Payed the user " +
            account.address +
            " on podcast " +
            _podcastId +
            " for 3 listen"
        );
      }*/
    });

    // Mint a podcast per account
    for (const account of accounts) {
      // Mint podcast
      await minter.addPodcast(1000, 100, 10, 5, account.address);
      console.log("New podcast minted for the owner " + account.address);
    }
  } catch (e: any) {
    console.log(e.message);
  }
})();

async function deployContract<Type extends Contract>(
  name: string,
  args?: unknown[]
): Promise<Type> {
  const contractFactory = await ethers.getContractFactory(name);
  return (await upgrades.deployProxy(contractFactory, args, {
    kind: "uups",
  })) as Type;
}
