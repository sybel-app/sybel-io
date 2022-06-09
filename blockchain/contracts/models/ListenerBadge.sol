// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct ListenerBadge {
    uint coefficient; // Custom coefficient, can be adjusted via TSE burning
    uint sNftOwnedCount; // Number of sNFT this listener own (no matter which podcast)
}
