interface ListenAnalyticsDbDto {
  readonly userId: string;
  readonly seriesId: string;
  readonly givenToUser: boolean;
  readonly date: FirebaseFirestore.Timestamp;
}

export default ListenAnalyticsDbDto;
