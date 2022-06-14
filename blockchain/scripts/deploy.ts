// This script can be used to deploy the "PodcastHandler" contract using Web3 library.
import { Signer } from "ethers";
import { ethers, waffle } from "hardhat";

const hre = require("hardhat");
const { deployContract } = waffle;

import { GovernanceToken } from "../typechain-types/contracts/tokens/GovernanceToken";
import { InternalTokens } from "../typechain-types/contracts/tokens/InternalTokens";
import { PodcastHandler } from "../typechain-types/contracts/PodcastHandler";
import { SybelRoles } from "../typechain-types/contracts/utils/SybelRoles";

(async () => {
  try {
    console.log(
      "Deploying all the contract for a simple blockchain intergration"
    );
    // Get our signers
    const signers = await ethers.getSigners();
    const signer = signers[0];

    // Deploy our libs
    const SybelMathFactory = await ethers.getContractFactory("SybelMath");
    const sybelMath = await SybelMathFactory.deploy();
    console.log("Sybel math deployed to " + sybelMath.address);
    const SybelRolesFactory = await ethers.getContractFactory("SybelRoles");
    const sybelRoles = (await SybelRolesFactory.deploy()) as SybelRoles;
    console.log("Sybel roles deployed to " + sybelRoles.address);

    // Deploy our governance token contract
    const governanceTokenFactory = await ethers.getContractFactory(
      "GovernanceToken"
    );
    const governanceToken =
      (await governanceTokenFactory.deploy()) as GovernanceToken;
    console.log("Governance token deployed to " + governanceToken.address);

    // Deploy our internal token contract
    const internalTokensFactory = await ethers.getContractFactory(
      "InternalTokens",
      {
        libraries: {
          SybelMath: sybelMath.address,
        },
      }
    );
    const internalTokens =
      (await internalTokensFactory.deploy()) as InternalTokens;
    console.log("Internal tokens deployed to " + internalTokens.address);

    // Deploy our podcast handler contract
    // TODO : should pass the internal tokens and governance token address as param
    const podcastHandlerFactory = await ethers.getContractFactory(
      "PodcastHandler",
      {
        libraries: {
          SybelMath: sybelMath.address,
        },
      }
    );
    const podcastHandler = (await podcastHandlerFactory.deploy(
      governanceToken.address,
      internalTokens.address
    )) as PodcastHandler;
    console.log("Podcast handler deployed to " + podcastHandler.address);

    // Grand the address updater and minter roles to the podcast handler contract, on the internal tokens contracts one
    await internalTokens.grantRole(
      sybelRoles.ADDRESS_UPDATER_ROLE(),
      podcastHandler.address
    );
    await internalTokens.grantRole(
      sybelRoles.MINTER_ROLE(),
      podcastHandler.address
    );
    console.log(
      "Podcast handler roles granted on the internal tokens contract"
    );

    // Ask the podcast handler to refresh the badges url on the internal tokens contracts
    await podcastHandler.updateBadgesAddrOnInnerContract();
    console.log(
      "Badges refreshed on the internal tokens from the podcast handler contracts"
    );
  } catch (e: any) {
    console.log(e.message);
  }
})();
