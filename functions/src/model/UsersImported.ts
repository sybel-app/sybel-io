export class UsersImported {
  ownerIdSet: Set<String>;
  userIdSet: Set<String>;

  constructor(ownerIdSet: Set<String>, userIdSet: Set<String>) {
    this.ownerIdSet = ownerIdSet;
    this.userIdSet = userIdSet;
  }
}
