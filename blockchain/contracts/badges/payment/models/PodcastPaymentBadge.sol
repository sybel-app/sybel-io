// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

struct PodcastPaymentBadge {
    address ownerAddress; // Owner's address of the given podcast id
    uint256 multiplier; // Multipliers to apply for each of his payment
}
