import { firestore } from "firebase-admin";

export interface ConsumedContentDbDto {
  readonly userId: string;
  readonly currentWeekCcu: number;
  readonly ccuPerWeeks: CcuPerWeek[];
}

export interface CcuPerWeek {
  readonly ccuCount: number;
  readonly date: firestore.Timestamp;
}
