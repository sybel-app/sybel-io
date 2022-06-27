import { task, types } from "hardhat/config";
// import { ethers } from "hardhat";

import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-tracer";
import "hardhat-contract-sizer";

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (_, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
export default {
  solidity: "0.8.4",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
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
