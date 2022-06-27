// This script can be used to deploy the "PodcastHandler" contract using Web3 library.
import { ethers, upgrades } from "hardhat";

import { Bytes } from "ethers";

const hre = require("hardhat");

import { SybelInternalTokens } from "../typechain-types/contracts/tokens/SybelInternalTokens";
import { SybelMediaToken } from "../typechain-types/contracts/tokens/SybelMediaToken";
import { TokenSybelEcosystem } from "../typechain-types/contracts/tokens/TokenSybelEcosystem";
import { ListenerBadges } from "../typechain-types/contracts/badges/payment/ListenerBadges";
import { PodcastBadges } from "../typechain-types/contracts/badges/payment/PodcastBadges";
import { Minter } from "../typechain-types/contracts/minter/Minter";
import { Rewarder } from "../typechain-types/contracts/reward/Rewarder";
import { SybelRoles } from "../typechain-types/contracts/utils/SybelRoles";

(async () => {
  try {
    console.log(
      "Deploying all the contract for a simple blockchain intergration"
    );

    hre.tracer.enabled = true;

    // Deploy our roles libs (just use to access the roles, not really needed)
    const SybelRolesFactory = await ethers.getContractFactory("SybelRoles");
    const sybelRoles = (await SybelRolesFactory.deploy()) as SybelRoles;
    console.log("Sybel roles deployed to " + sybelRoles.address);

    // Deploy our internal token contract
    const internalTokensFactory = await ethers.getContractFactory(
      "SybelInternalTokens"
    );
    const internalToken = (await upgrades.deployProxy(
      internalTokensFactory
    )) as SybelInternalTokens;
    console.log("Internal tokens deployed to " + internalToken.address);

    // Deploy our tse token contract
    const tseFactory = await ethers.getContractFactory("TokenSybelEcosystem");
    const tseToken = (await upgrades.deployProxy(
      tseFactory
    )) as TokenSybelEcosystem;
    console.log("TSE token deployed to " + tseToken.address);

    // Deploy our smt token contract
    const smtFactory = await ethers.getContractFactory("SybelMediaToken");
    const smtToken = (await upgrades.deployProxy(
      smtFactory
    )) as SybelMediaToken;
    console.log("SMT token deployed to " + smtToken.address);

    // Deploy our podcast badges contracts
    /*const listenerFactory = await ethers.getContractFactory("ListenerBadges", {
      libraries: {
        SybelMath: sybelMath.address,
      },
    });
    const listenerBadges = (await listenerFactory.deploy()) as ListenerBadges;
    console.log("Listener badges deployed to " + listenerBadges.address);

    const podcastFactory = await ethers.getContractFactory("PodcastBadges", {
      libraries: {
        SybelMath: sybelMath.address,
      },
    });
    const podcastBadges = (await podcastFactory.deploy()) as PodcastBadges;
    console.log("Podcast badges deployed to " + podcastBadges.address);*/

    console.log(
      "Podcast handler roles granted on the internal tokens contract"
    );

    hre.tracer.enabled = false;
  } catch (e: any) {
    console.log(e.message);
  }
})();
