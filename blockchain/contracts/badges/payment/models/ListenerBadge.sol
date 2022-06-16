// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct ListenerBadge {
    uint256 coefficient; // Custom coefficient, can be adjusted via TSE burning
    mapping(uint256 => ListenerBalance[]) podcastBalances; // The balance of each podcast
}

struct ListenerBalance {
    uint256 tokenType;
    uint256 balance;
}
