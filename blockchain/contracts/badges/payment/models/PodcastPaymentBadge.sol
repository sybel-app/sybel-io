// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct PodcastPaymentBadge {
    address owners; // Owner's address of the given podcast id
    uint256 multiplier; // Multipliers to apply for each of his payment
    uint256 ratio; // The ratio to be applied (amount for podcaster and amount for user) (on a 1000 scale, since no decimals)
}
