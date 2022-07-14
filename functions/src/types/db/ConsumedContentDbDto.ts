interface ConsumedContentDbDto {
  readonly userId: string;
  readonly currentWeekCcu: number;
  readonly ccuPerWeeks: CcuPerWeek[];
}

export interface CcuPerWeek {
  readonly ccuCount: number;
  readonly weekNumber: number;
}

export default ConsumedContentDbDto;
