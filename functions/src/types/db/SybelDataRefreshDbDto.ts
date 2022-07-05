import { Timestamp } from "@firebase/firestore";

interface SybelDataRefreshDbDto {
  readonly timestamp: Timestamp;
  readonly importCount: number;
}

export default SybelDataRefreshDbDto;
