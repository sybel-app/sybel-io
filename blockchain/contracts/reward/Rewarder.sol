// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IRewarder.sol";
import "../badges/access/PaymentBadgesAccessor.sol";
import "../utils/pausable/AccessControlPausable.sol";
import "../utils/SybelMath.sol";
import "../utils/SybelRoles.sol";
import "../tokens/InternalTokens.sol";
import "../tokens/GovernanceToken.sol";
import "../badges/payment/models/PodcastPaymentBadge.sol";

/**
 * @dev Represent our rewarder contract
 */
contract Rewarder is IRewarder, AccessControlPausable, PaymentBadgesAccessor {
    // Our base reward amount for podcast listen and owner
    uint256 private constant USER_LISTEN_REWARD = 10**3; // So 0.001 TSE
    uint256 private OWNER_LISTEN_REWARD = SybelMath.DECIMALS / 10; // So 0.1 TSE

    // Our coefficient, should be updatable (and moved to the listener and podcast badges directly ?)
    uint256 private constant SYBEL_COEFFICIENT = 250;

    // Maximum data we can treat in a batch manner
    uint256 private constant MAX_BATCH_AMOUNT = 20;

    // Map between tokens types to ratio (in percent)
    mapping(uint256 => uint256) tokenTypesToRatio;

    // Map between tokens types to earn multiplier (in perthrousand)
    mapping(uint256 => uint256) tokenTypesToEarnMultiplier;

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
     * @dev Pay a user for all the listening he have done on different podcast
     */
    function getPaymentBadges(
        address _listener,
        uint256[] calldata _podcastIds,
        uint256[] calldata _listenCounts
    ) external override onlyRole(SybelRoles.REWARDER) whenNotPaused {
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
            // Find the balance of the listener for this podcast
            ListenerBalanceOnPodcast[]
                memory balances = getListenerBalanceForPodcast(
                    _listener,
                    _podcastIds[i]
                );
            // Check if the user as at least on balance on a token types
            bool hasAtLeastOneBalance = false;
            for (uint256 j = 0; i < balances.length; ++i) {
                hasAtLeastOneBalance =
                    hasAtLeastOneBalance ||
                    balances[j].balance > 0;
            }
            // TODO : If no balance mint a standart NFT
            // If he as at least one balance
            if (hasAtLeastOneBalance) {
                mintForUser(
                    _listener,
                    _podcastIds[i],
                    _listenCounts[i],
                    balances
                );
            }
        }
    }

    /**
     * @dev Mint the reward for the given user, and take in account his balances for the given podcast
     */
    function mintForUser(
        address _listener,
        uint256 _podcastId,
        uint256 _listenCount,
        ListenerBalanceOnPodcast[] memory _balances
    ) private {
        // The user have a balance we can continue
        PodcastPaymentBadge memory podcastBadge = podcastBadges.getPaymentBadge(
            _podcastId,
            _listenCount
        );
        // Get the listener multiplier
        uint256 listenerMultiplier = listenerBadges.getMultiplier(_listener);
        // Mint each token for each fraction
        for (uint256 i = 0; i < _balances.length; ++i) {
            // Compute the amount for the owner and the users
            uint256 amountToMintOnAThousand = _balances[i].balance *
                tokenTypesToEarnMultiplier[_balances[i].tokenType] *
                USER_LISTEN_REWARD *
                podcastBadge.multiplier *
                listenerMultiplier *
                _listenCount;
            // Check if we need to mint something
            if (amountToMintOnAThousand > 0) {
                // Get the ratio between the user and the owner of the podcast (on a thousand)
                uint256 ratioOwnerUser = tokenTypesToRatio[
                    _balances[i].tokenType
                ];
                // Compute the right amount to mint
                uint256 amountToMint = amountToMintOnAThousand / 1000;
                uint256 amountForOwner = (amountToMint * ratioOwnerUser) / 100;
                uint256 amountForListener = amountToMint - amountForOwner;
                // Mint the TSE for the listener and the owner of the podcast
                internalTokens.mintUtility(_listener, amountForListener);
                internalTokens.mintUtility(
                    podcastBadge.ownerAddress,
                    amountForOwner
                );
            }
        }
    }

    /**
     * @dev Find the balance of the given user on each tokens
     */
    function getListenerBalanceForPodcast(address _listener, uint256 _podcastId)
        private
        view
        returns (ListenerBalanceOnPodcast[] memory)
    {
        // The different types we will fetch
        uint256[] memory types = new uint256[](3);
        types[0] = SybelMath.TOKEN_TYPE_EPIC_MASK;
        types[1] = SybelMath.TOKEN_TYPE_RARE_MASK;
        types[2] = SybelMath.TOKEN_TYPE_CLASSIC_MASK;
        // Build our initial balance map
        ListenerBalanceOnPodcast[]
            memory balances = new ListenerBalanceOnPodcast[](types.length);
        // Iterate over each types to find the balances
        for (uint256 i = 0; i < types.length; ++i) {
            balances[i] = ListenerBalanceOnPodcast(
                types[i],
                internalTokens.balanceOf(
                    _listener,
                    SybelMath.buildSnftId(_podcastId, types[i])
                )
            );
        }
        return balances;
    }

    struct ListenerBalanceOnPodcast {
        uint256 tokenType;
        uint256 balance;
    }
}
