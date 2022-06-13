// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct PodcastPaymentBadge {
    address owner; // Owner address of the given podcast id
    uint256 multiplier; // Multiplier to apply for his payment
    PodcastInvestorPaymentBadge[] investorsPayment; // Investor payment's
}

struct PodcastInvestorPaymentBadge {
    address investor; // Investor address of this payment badge
    uint256 multiplier; // Multiplier to apply for his payment
}
