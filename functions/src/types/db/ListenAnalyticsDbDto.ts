interface ListenAnalyticsDbDto {
  readonly userId: string;
  readonly seriesId: string;
  readonly givenToUser: boolean;
  readonly date: FirebaseFirestore.Timestamp;
  readonly rewardTxHash: string | null; // Can be null if rewarder cron not passed yet, or if series id not minted
  readonly txBlockNumber: number | null; // Can be null if tx not mined
  readonly txBlockHash: string | null; // Can be null if tx not mined
}

export default ListenAnalyticsDbDto;
