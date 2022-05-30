import { Timestamp } from "@firebase/firestore";

interface SybelDataRefresh {
  timestamp: Timestamp;
  importCount: number;
}

export default SybelDataRefresh;
