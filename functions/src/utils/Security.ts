import { utils } from "ethers";
import * as functions from "firebase-functions";
import BaseRequestDto from "../types/request/BaseRequestDto";

/**
 * Ensure the call data are correct
 * @param {BaseRequestDto} data
 */
export function checkCallData(data: BaseRequestDto) {
  // Ensure we got an hashed key
  if (!data.hashed_key || !data.id) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The hashed key or the user id isn't present"
    );
  }

  // Ensure the hashed key is corerct
  const builtHashedKey = utils.keccak256(
    `${process.env.SYBEL_BACK_API_KEY}_${data.id}`
  );
  if (data.hashed_key != builtHashedKey) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "The hashed key isn't correct"
    );
  }
}
