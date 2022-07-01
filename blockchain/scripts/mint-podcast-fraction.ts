// This script can be used to deploy the "PodcastHandler" contract using Web3 library.
import { ethers } from "hardhat";

import { BigNumber, Contract } from "ethers";

const hre = require("hardhat");

import { Minter } from "../typechain-types/contracts/minter/Minter";
import { TokenSybelEcosystem } from "../typechain-types/contracts/tokens/TokenSybelEcosystem";
import { FractionCostBadges } from "../typechain-types/contracts/badges/cost/FractionCostBadges";

import {
  minterAddr,
  tseTokenAddr,
  fractionCostBadgesAddr,
} from "../addresses.json";

(async () => {
  try {
    console.log("Minting some podcast fraction");

    // Find our minter contract and our tse contracts
    const minter = await findContract<Minter>("Minter", minterAddr);
    const tseContract = await findContract<TokenSybelEcosystem>(
      "TokenSybelEcosystem",
      tseTokenAddr
    );
    const fractionContract = await findContract<FractionCostBadges>(
      "FractionCostBadges",
      fractionCostBadgesAddr
    );

    // Get 5 accounts
    const accounts = (await hre.ethers.getSigners()).slice(5, 10);

    // Get the last minted podcast id
    const podcastMintEventFilter = minter.filters.PodcastMinted();
    const podcastMintedEvents = await minter.queryFilter(
      podcastMintEventFilter
    );
    const podcastIds = podcastMintedEvents.map((podcastMintedEvent) => {
      return podcastMintedEvent.args.baseId;
    });
    for (const podcastId of podcastIds) {
      // Mint a classic fraction per account on the first minted podcast
      for (const account of accounts) {
        const tokenType = getRandomTokenType();
        const fractionId = podcastId.shl(4).or(BigNumber.from(tokenType));
        // Get the price of this fraction
        const initialPrice = await fractionContract.initialFractionCost(
          tokenType
        );
        console.log(
          "Initial price of the fraction " +
            fractionId +
            " is " +
            initialPrice / 1e6 +
            "TSE"
        );
        // Give the user 10 TSE
        await tseContract.mint(account.address, 10 * 1e6);
        try {
          // Mint some fraction
          await minter.mintFraction(fractionId, account.address, 1);
          console.log(
            "New fraction of podcast minted for the user " +
              account.address +
              " on fraction " +
              fractionId
          );
        } catch (e: unknown) {
          console.log("Error during the mint process");
        }
      }
    }
  } catch (e: any) {
    console.log(e.message);
  }
})();

function getRandomTokenType(): number {
  const min = Math.ceil(3);
  const max = 6;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function findContract<Type extends Contract>(
  name: string,
  address: string
): Promise<Type> {
  const contractFactory = await ethers.getContractFactory(name);
  return contractFactory.attach(address) as Type;
}
