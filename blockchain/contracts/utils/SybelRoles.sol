// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

library SybelRoles {
    // Administrator role of a contra
    bytes32 public constant ADMIN = 0x00;

    // Role required to update a smart contract
    bytes32 public constant UPGRADER = keccak256("UPGRADER_ROLE");

    // Role required to pause a smart contract
    bytes32 public constant PAUSER = keccak256("PAUSER_ROLE");

    // Role required to mint new token on in a contract
    bytes32 public constant MINTER = keccak256("MINTER_ROLE");

    // Role required to update the badge in a contract
    bytes32 public constant BADGE_UPDATER = keccak256("BADGE_UPDATER_ROLE");

    // Role required to reward user for their listen
    bytes32 public constant REWARDER = keccak256("REWARDER_ROLE");
}
