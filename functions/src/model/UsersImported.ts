/**
 * Represent a list of user we imported
 */
export class UsersImported {
  ownerIdSet: Set<string>;
  userIdSet: Set<string>;

  /**
   * Build our object
   * @param {Set<String>} ownerIdSet all the owner id's imported
   * @param {Set<String>} userIdSet all the user id's imported
   */
  constructor(
    ownerIdSet: Set<string> = new Set(),
    userIdSet: Set<string> = new Set()
  ) {
    this.ownerIdSet = ownerIdSet;
    this.userIdSet = userIdSet;
  }
}
