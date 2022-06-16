// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct PodcastBadge {
    uint256 coefficient; // Custom coefficient, can be adjusted via TSE burning
    uint256 investmentCoefficient; // Coefficient computed from the investmend done on this podcast
    uint256 lastWeekListenCount; // Number of listen performed on this token last week
    uint256 currentWeekListenCount; // Number of listen performed on this token this week
    uint256 lastWeekTimestamp; // The timestamp at which the last week refresh was done
}
