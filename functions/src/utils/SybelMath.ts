import { BigNumber } from "ethers";

export const TOKEN_ID_OFFSET = 4;

export const TOKEN_TYPES_NFT = 1;
export const TOKEN_TYPES_STANDART = 2;
export const TOKEN_TYPES_CLASSIC = 3;
export const TOKEN_TYPES_RARE = 4;
export const TOKEN_TYPES_EPIC = 5;
export const TOKEN_TYPES_LEGENDARY = 6;

export const BUYABLE_TOKEN_TYPES = [
  TOKEN_TYPES_CLASSIC,
  TOKEN_TYPES_RARE,
  TOKEN_TYPES_EPIC,
  TOKEN_TYPES_LEGENDARY,
];

/**
 * Build the id of a nft fraction from a podcast id and the token type
 * @param podcastId The id of the podcast for whioch we want to build the fraction id
 * @param tokenType The type of fraction we want
 * @returns The erc1155 token id
 */
export function buildFractionId(
  podcastId: BigNumber,
  tokenType: number
): BigNumber {
  return podcastId.shl(TOKEN_ID_OFFSET).or(BigNumber.from(tokenType));
}

const tokenTypesData: { rarity: string; rarityNumber: number }[] = [
  { rarity: "Creator Nft", rarityNumber: TOKEN_TYPES_NFT },
  { rarity: "Standart", rarityNumber: TOKEN_TYPES_STANDART },
  { rarity: "Common", rarityNumber: TOKEN_TYPES_CLASSIC },
  { rarity: "Rare", rarityNumber: TOKEN_TYPES_RARE },
  { rarity: "Epic", rarityNumber: TOKEN_TYPES_EPIC },
  { rarity: "Legendary", rarityNumber: TOKEN_TYPES_LEGENDARY },
];

export { tokenTypesData };
