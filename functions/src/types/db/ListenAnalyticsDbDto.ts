import { Timestamp } from "@firebase/firestore";

interface ListenAnalyticsDbDto {
  readonly rssUrl: string;
  readonly userId: string;
  readonly ownerId: string;
  readonly seriesId: string;
  readonly givenToUser: boolean;
  readonly data: Timestamp;
}

export default ListenAnalyticsDbDto;
