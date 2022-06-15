import { task, types } from "hardhat/config";
// import { ethers } from "hardhat";

import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (_, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// Task to deploy all of our contracts
task("deployAll", "Directly deploy all the smart contract's").setAction(
  async (_, hre) => {
    try {
      console.log(
        "Deploying all the contract for a simple blockchain intergration"
      );
      // Deploy our libs
      const SybelMathFactory = await hre.ethers.getContractFactory("SybelMath");
      const sybelMath = await SybelMathFactory.deploy();
      console.log("Sybel math deployed to " + sybelMath.address);
      const SybelRolesFactory = await hre.ethers.getContractFactory(
        "SybelRoles"
      );
      const sybelRoles = await SybelRolesFactory.deploy();
      console.log("Sybel roles deployed to " + sybelRoles.address);

      // Deploy our governance token contract
      const governanceTokenFactory = await hre.ethers.getContractFactory(
        "GovernanceToken"
      );
      const governanceToken = await governanceTokenFactory.deploy();
      console.log("Governance token deployed to " + governanceToken.address);

      // Deploy our internal token contract
      const internalTokensFactory = await hre.ethers.getContractFactory(
        "InternalTokens",
        {
          libraries: {
            SybelMath: sybelMath.address,
          },
        }
      );
      const internalTokens = await internalTokensFactory.deploy();
      console.log("Internal tokens deployed to " + internalTokens.address);

      // Deploy our podcast handler contract
      // TODO : should pass the internal tokens and governance token address as param
      const podcastHandlerFactory = await hre.ethers.getContractFactory(
        "PodcastHandler",
        {
          libraries: {
            SybelMath: sybelMath.address,
          },
        }
      );
      const podcastHandler = await podcastHandlerFactory.deploy(
        governanceToken.address,
        internalTokens.address
      );
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
  }
);

// Task to mint a simple podcast
task("mintPodcast", "Mint a simple podcast")
  .addOptionalParam(
    "classicSupply",
    "Number of classic token emitted",
    10,
    types.int
  )
  .addOptionalParam("rareSupply", "Number of rare token emitted", 0, types.int)
  .addOptionalParam("epicSupply", "Number of epic token emitted", 0, types.int)
  .addParam("owner", "The owner address of this token", null, types.string)
  .setAction(async (taskArgs, hre) => {
    try {
      const sybelMathAddr = "0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB";
      const podcastHandlerAddr = "0x851356ae760d987E095750cCeb3bC6014560891C";

      const SybelMathFactory = await hre.ethers.getContractFactory("SybelMath");
      const sybelMath = SybelMathFactory.attach(sybelMathAddr);

      console.log("Starting to mint a new podcast");
      const podcastHandlerFactory = await hre.ethers.getContractFactory(
        "PodcastHandler",
        {
          libraries: {
            SybelMath: sybelMath.address,
          },
        }
      );
      // Find our podcast handler contract and attach to it
      const podcastHandler = podcastHandlerFactory.attach(podcastHandlerAddr);
      // Mint our podcast
      const mintTransaction = await podcastHandler.addPodcast(
        taskArgs.classicSupply,
        taskArgs.rareSupply,
        taskArgs.epicSupply,
        "0x",
        taskArgs.owner
      );
      console.log("Minted the podcast on tx" + mintTransaction.hash);
      console.log("Minted the podcast with data result" + mintTransaction.data);
    } catch (e: any) {
      console.log(e.message);
    }
  });

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
export default {
  solidity: "0.8.4",
  settings: {
    optimizer: {
      enabled: true,
      runs: 1000,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  compilerOptions: {
    target: "es2018",
    module: "commonjs",
    strict: true,
    esModuleInterop: true,
    outDir: "dist",
    resolveJsonModule: true,
  },
  include: ["./scripts", "./test", "./typechain-types"],
  files: ["./hardhat.config.ts"],
};
