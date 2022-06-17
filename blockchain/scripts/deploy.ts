// This script can be used to deploy the "PodcastHandler" contract using Web3 library.
import { ethers } from "hardhat";

import { Bytes } from "ethers";

const hre = require("hardhat");

import { GovernanceToken } from "../typechain-types/contracts/tokens/GovernanceToken";
import { InternalTokens } from "../typechain-types/contracts/tokens/InternalTokens";
import { Minter } from "../typechain-types/contracts/minter/Minter";
import { Rewarder } from "../typechain-types/contracts/reward/Rewarder";
import { Orchestrator } from "../typechain-types/contracts/orchestrator/Orchestrator";
import { SybelRoles } from "../typechain-types/contracts/utils/SybelRoles";

(async () => {
  try {
    console.log(
      "Deploying all the contract for a simple blockchain intergration"
    );

    hre.tracer.enabled = true;

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
    const orchestratorFactory = await ethers.getContractFactory(
      "Orchestrator",
      {
        libraries: {
          SybelMath: sybelMath.address,
        },
      }
    );
    const orchestrator = (await orchestratorFactory.deploy(
      governanceToken.address,
      internalTokens.address
    )) as Orchestrator;
    console.log("Orchestrator deployed to " + orchestrator.address);

    // Grand the address updater and minter roles to the podcast handler contract, on the internal tokens contracts one
    await internalTokens.grantRole(sybelRoles.ADMIN(), orchestrator.address);

    // Update the internal token rights
    await orchestrator.updateInternalTokenRole();

    console.log(
      "Podcast handler roles granted on the internal tokens contract"
    );

    hre.tracer.enabled = false;
  } catch (e: any) {
    console.log(e.message);
  }
})();
