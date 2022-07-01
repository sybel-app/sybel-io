// This script can be used to deploy the "PodcastHandler" contract using Web3 library.
import { ethers } from "hardhat";

import { Contract } from "ethers";

const hre = require("hardhat");

import { TokenSybelEcosystem } from "../typechain-types/contracts/tokens/TokenSybelEcosystem";
import { tseTokenAddr } from "../addresses.json";

(async () => {
  try {
    console.log("Paying some random listen to all the known accounts");

    // Find our required contracts
    const tseToken = await findContract<TokenSybelEcosystem>(
      "TokenSybelEcosystem",
      tseTokenAddr
    );

    // Get all the first accounts
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
      const balance = await tseToken.balanceOf(account.address);
      console.log(
        "The user " +
          account.address +
          " have " +
          balance.toNumber() / 1e6 +
          "TSE"
      );
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

function generateRandomListenCountArray(podcastIdsCount: number): number[] {
  return [...Array(podcastIdsCount).keys()].map((_) => {
    return getRandomInt();
  });
}

function getRandomInt(): number {
  const min = Math.ceil(1);
  const max = Math.floor(5);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
