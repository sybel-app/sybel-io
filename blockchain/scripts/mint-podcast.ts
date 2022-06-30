// This script can be used to deploy the "PodcastHandler" contract using Web3 library.
import { ethers } from "hardhat";

import { Contract } from "ethers";

const hre = require("hardhat");

import { Minter } from "../typechain-types/contracts/minter/Minter";

import { minterAddr } from "../addresses.json";

(async () => {
  try {
    console.log("Minting some podcast");

    // Find our minter contract
    const minter = await findContract<Minter>("Minter", minterAddr);

    // Get the 5 first accounts
    const accounts = (await hre.ethers.getSigners()).slice(0, 5);

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

async function findContract<Type extends Contract>(
  name: string,
  address: string
): Promise<Type> {
  const contractFactory = await ethers.getContractFactory(name);
  return contractFactory.attach(address) as Type;
}
