// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
    
struct PodcastBadge {
    uint coefficient; // Custom coefficient, can be adjusted via TSE burning
    uint numberOfInvestor; // Number of wallet that has at least of this podcast sNFT
    uint shareCount; // Number of sNFT this podcast shared on the market
}