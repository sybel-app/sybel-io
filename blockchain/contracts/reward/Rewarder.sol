// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IRewarder.sol";
import "../badges/accessor/AccessControlBadgeAccessor.sol";
import "../utils/pausable/AccessControlPausable.sol";
import "../utils/SybelMath.sol";
import "../tokens/InternalTokens.sol";
import "../tokens/GovernanceToken.sol";

/**
 * @dev Represent our rewarder contract
 */
contract Rewarder is
    IRewarder,
    AccessControlPausable,
    AccessControlBadgeAccessor
{
    // Our base reward amount for podcast listen and owner
    uint256 private constant USER_LISTEN_REWARD = 10**3; // So 0.001 TSE
    uint256 private OWNER_LISTEN_REWARD = SybelMath.DECIMALS / 10; // So 0.1 TSE

    // Our coefficient, should be updatable (and moved to the listener and podcast badges directly ?)
    uint256 private constant SYBEL_COEFFICIENT = 250;

    // Maximum data we can treat in a batch manner
    uint256 private constant MAX_BATCH_AMOUNT = 20;

    /**
     * @dev Access our internal token
     */
    InternalTokens private internalTokens;

    /**
     * @dev Access our governance token
     */
    GovernanceToken private governanceToken;

    /**
     * @dev Build our podcast handler from the deployed governance and internal token contracts
     */
    constructor(address governanceTokenAddr, address internalTokenAddr) {
        // Find our internal token provider contract
        internalTokens = InternalTokens(internalTokenAddr);
        // Find our governance token provider contract
        governanceToken = GovernanceToken(governanceTokenAddr);
    }

    /**
     * @dev Pay a group of user listening
     */
    function payUserListen(
        address[] calldata _listenerAddresses,
        uint256[] calldata _listenCounts
    ) external override onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        require(
            _listenerAddresses.length == _listenCounts.length,
            "SYB: Can't pay for listeners address and listen of different length"
        );
        require(
            _listenerAddresses.length <= MAX_BATCH_AMOUNT,
            "SYB: Can't treat more than 20 items at a time"
        );
        // Iterate over each user
        for (uint256 i = 0; i < _listenerAddresses.length; ++i) {
            uint256 amountToPay = USER_LISTEN_REWARD *
                listenerBadges.getMultiplier(_listenerAddresses[i]);
            _listenCounts[i];
            // Mint the given token's
            internalTokens.mintUtility(_listenerAddresses[i], amountToPay);
        }
    }

    /**
     * @dev Pay a group of podcast owner
     */
    function payPodcastOwner(
        uint256[] calldata _podcastIds,
        uint256[] calldata _listenCounts
    ) external override onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        require(
            _podcastIds.length == _listenCounts.length,
            "SYB: Can't pay of podcast for id and listen of different length"
        );
        require(
            _podcastIds.length <= MAX_BATCH_AMOUNT,
            "SYB: Can't treat more than 20 items at a time"
        );
        // Iterate over each podcast
        for (uint256 i = 0; i < _podcastIds.length; ++i) {
            uint256 amountToPay = OWNER_LISTEN_REWARD *
                podcastBadges.getMultiplier(_podcastIds[i]) *
                _listenCounts[i];
            // Mint the given token's
            internalTokens.mintUtility(
                podcastBadges.getOwner(_podcastIds[i]),
                amountToPay
            );
        }
    }
}
