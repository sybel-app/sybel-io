import PodcastInfo from "../request/PodcastInfo";

interface MintedPodcastDbDto {
  readonly seriesId: string;
  readonly txHash: string;
  readonly podcastInfo: PodcastInfo;
  readonly fractionBaseId?: number | null; // Can be null if not minted yet
  readonly txBlockNumber?: number | null; // Can be null if not minted yet
  readonly txBlockHash?: string | null; // Can be null if not minted yet
  readonly txBlockTimestamp?: FirebaseFirestore.Timestamp | null; // Can be null if not minted yet
  readonly uploadedMetadatas?: string[] | null;
  readonly previousCostUpdate?: CostBadgeUpdate;
}

export interface CostBadgeUpdate {
  readonly period: CostBadgeUpdatePeriod;
  readonly txHashes: string[];
}

// TODO : Store last minting cost refresh block numbers ?
export interface CostBadgeUpdatePeriod {
  readonly lastWeekBlockStart: number;
  readonly currentWeekBlockStart: number;
  readonly currentWeekBlockEnd: number;
}

export default MintedPodcastDbDto;
