interface MintedPodcastDbDto {
  readonly seriesId: string;
  readonly fractionBaseId: number;
  readonly txBlockNumber: number;
  readonly txBlockHash: string;
}

export default MintedPodcastDbDto;
