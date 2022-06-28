// This script can be used to deploy the "PodcastHandler" contract using Web3 library.
import { ethers } from "hardhat";

import { Contract } from "ethers";

const hre = require("hardhat");

import { TokenSybelEcosystem } from "../typechain-types/contracts/tokens/TokenSybelEcosystem";
import { Minter } from "../typechain-types/contracts/minter/Minter";
import { Rewarder } from "../typechain-types/contracts/reward/Rewarder";

import { minterAddress, rewarderAddress, tseAddress } from "./addresses";

(async () => {
  try {
    console.log("Paying some random listen to all the known accounts");

    // Find our required contracts
    const tseToken = await findContract<TokenSybelEcosystem>(
      "TokenSybelEcosystem",
      tseAddress
    );
    const rewarder = await findContract<Rewarder>("Rewarder", rewarderAddress);
    const minter = await findContract<Minter>("Minter", minterAddress);

    // Get all the first accounts
    const accounts = await hre.ethers.getSigners();

    // For every podcast minted event, simulate some listen
    const podcastMintEventFilter = minter.filters.PodcastMinted();
    const podcastMintedEvents = await minter.queryFilter(
      podcastMintEventFilter
    );
    const podcastIds = podcastMintedEvents.map((podcastMintedEvent) => {
      return podcastMintedEvent.args.baseId;
    });

    const decimals = await tseToken.decimals();

    // Pay some random listening time on each account
    for (const account of accounts) {
      const listens = generateRandomListenCountArray(podcastIds.length);
      await rewarder.payUser(account.address, podcastIds, listens);
      const balance = await tseToken.balanceOf(account.address);
      console.log(
        "Payed the user " +
          account.address +
          " on podcasts " +
          podcastIds +
          " for listens " +
          listens +
          " new TSE balance " +
          balance.toNumber() / decimals
      );
    }

    // Get the TSE balance of each user
    for (const account of accounts) {
      const balance = await tseToken.balanceOf(account.address);
      console.log(
        "User " +
          account.address +
          " have " +
          balance.toNumber() / decimals +
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
  const max = Math.floor(20);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
