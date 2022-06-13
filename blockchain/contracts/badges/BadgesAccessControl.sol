// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../utils/SybelRoles.sol";

/**
 * @dev Abstract control that help us handling badge access control
 */
abstract contract BadgesAccessControl is AccessControl {
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // Allow only the updater role
    modifier onlyUpdater() {
        _checkRole(SybelRoles.BADGE_UPDATER_ROLE);
        _;
    }

    // Allow only the admin role
    modifier onlyAdmin() {
        _checkRole(DEFAULT_ADMIN_ROLE);
        _;
    }
}
