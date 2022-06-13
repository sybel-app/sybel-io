// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @dev Abstract control that help us handling badge access control
 */
abstract contract BadgesAccessControl is AccessControl {
    // The role required to update the badge
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER");

    constructor() {
        grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        grantRole(UPDATER_ROLE, msg.sender);
    }

    // Allow only the updater role
    modifier onlyUpdater() {
        _checkRole(UPDATER_ROLE);
        _;
    }

    // Allow only the admin role
    modifier onlyAdmin() {
        _checkRole(DEFAULT_ADMIN_ROLE);
        _;
    }
}
