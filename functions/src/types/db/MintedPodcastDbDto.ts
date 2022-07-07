import PodcastInfo from "../request/PodcastInfo";

interface MintedPodcastDbDto {
  readonly seriesId: string;
  readonly txHash: string;
  readonly podcastInfo: PodcastInfo;
  readonly fractionBaseId: number | null; // Can be null if not minted yet
  readonly txBlockNumber: number | null; // Can be null if not minted yet
  readonly txBlockHash: string | null; // Can be null if not minted yet
  readonly uploadedMetadatas: string[] | null;
}

export default MintedPodcastDbDto;
