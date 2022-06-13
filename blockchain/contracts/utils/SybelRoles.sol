// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library SybelRoles {
    // The role required to update the badge
    bytes32 public constant BADGE_UPDATER_ROLE = keccak256("BADGE_UPDATER");
    // The role required to update smart contracts addresses
    bytes32 public constant ADDRESS_UPDATER_ROLE = keccak256("ADDRESS_UPDATER");
    // The role required to mint new tokens
    bytes32 public constant MINTER_ROLE = keccak256("MINTER");
}
