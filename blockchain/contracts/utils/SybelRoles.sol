// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library SybelRoles {
    // The role required to update the badge
    bytes32 public constant BADGE_UPDATER = keccak256("BADGE_UPDATER");
    // The role required to update smart contracts addresses
    bytes32 public constant ADDRESS_UPDATER = keccak256("ADDRESS_UPDATER");
    // The role required to mint new tokens
    bytes32 public constant MINTER = keccak256("MINTER");
    // The role required to launch the reward for users
    bytes32 public constant REWARDER = keccak256("REWARDER");
    // The role required to launch the reward for users
    bytes32 public constant ADMIN = 0x00;
}
