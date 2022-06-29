// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./IRewarder.sol";
import "../badges/access/PaymentBadgesAccessor.sol";
import "../utils/SybelMath.sol";
import "../utils/SybelRoles.sol";
import "../tokens/SybelInternalTokens.sol";
import "../tokens/TokenSybelEcosystem.sol";
import "../utils/SybelAccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "hardhat/console.sol";

/**
 * @dev Represent our rewarder contract
 */
/// @custom:security-contact crypto-support@sybel.co
contract Rewarder is
    IRewarder,
    SybelAccessControlUpgradeable,
    PaymentBadgesAccessor
{
    // Our base reward amount for podcast listen and owner
    uint64 private constant USER_LISTEN_REWARD = 100; // So 0.001 TSE

    // Our coefficient, should be updatable (and moved to the listener and podcast badges directly ?)
    uint16 private constant SYBEL_COEFFICIENT = 250;

    // Maximum data we can treat in a batch manner
    uint8 private constant MAX_BATCH_AMOUNT = 20;

    // Map between tokens types to ratio (in percent)
    mapping(uint256 => uint8) tokenTypesToRatio;

    // Map between tokens types to earn multiplier (in percent)
    mapping(uint256 => uint16) tokenTypesToEarnMultiplier;

    /**
     * @dev Access our internal tokens
     */
    SybelInternalTokens private sybelInternalTokens;

    /**
     * @dev Access our governance token
     */
    TokenSybelEcosystem private tokenSybelEcosystem;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address tseAddr,
        address internalTokenAddr,
        address listenerBadgesAddr,
        address podcastBadgesAddr
    ) public initializer {
        __SybelAccessControlUpgradeable_init();
        __PaymentBadgesAccessor_init(listenerBadgesAddr, podcastBadgesAddr);

        // Grant the rewarder role to the contract deployer
        _grantRole(SybelRoles.REWARDER, msg.sender);

        // Add the initial token types to earn multiplier
        tokenTypesToEarnMultiplier[SybelMath.TOKEN_TYPE_STANDART_MASK] = 10; // x0.1
        tokenTypesToEarnMultiplier[SybelMath.TOKEN_TYPE_CLASSIC_MASK] = 100; // x1
        tokenTypesToEarnMultiplier[SybelMath.TOKEN_TYPE_RARE_MASK] = 200; // x2
        tokenTypesToEarnMultiplier[SybelMath.TOKEN_TYPE_EPIC_MASK] = 500; // x5
        tokenTypesToEarnMultiplier[SybelMath.TOKEN_TYPE_LEGENDARY_MASK] = 2000; // x20

        // Add the initial token types to ratio
        tokenTypesToRatio[SybelMath.TOKEN_TYPE_STANDART_MASK] = 1; // 1% for user
        tokenTypesToRatio[SybelMath.TOKEN_TYPE_CLASSIC_MASK] = 5; // 5% for user
        tokenTypesToRatio[SybelMath.TOKEN_TYPE_RARE_MASK] = 10; // 10% for user
        tokenTypesToRatio[SybelMath.TOKEN_TYPE_EPIC_MASK] = 25; // 25% for user
        tokenTypesToRatio[SybelMath.TOKEN_TYPE_LEGENDARY_MASK] = 50; // 50% for user

        sybelInternalTokens = SybelInternalTokens(internalTokenAddr);
        tokenSybelEcosystem = TokenSybelEcosystem(tseAddr);
    }

    /**
     * @dev Pay a user for all the listening he have done on different podcast
     */
    function payUser(
        address _listener,
        uint256[] calldata _podcastIds,
        uint16[] calldata _listenCounts
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
            (
                ListenerBalanceOnPodcast[] memory balances,
                bool hasAtLeastOneBalance
            ) = getListenerBalanceForPodcast(_listener, _podcastIds[i]);
            // If no balance mint a standart NFT
            if (!hasAtLeastOneBalance) {
                sybelInternalTokens.mint(
                    _listener,
                    SybelMath.buildStandartNftId(_podcastIds[i]),
                    1
                );
                // And then recompute his balance
                (balances, hasAtLeastOneBalance) = getListenerBalanceForPodcast(
                    _listener,
                    _podcastIds[i]
                );
            }
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
        uint16 _listenCount,
        ListenerBalanceOnPodcast[] memory _balances
    ) private {
        // The user have a balance we can continue
        uint64 podcastBadge;
        address podcastOwner;
        (podcastBadge, podcastOwner) = podcastBadges.getPaymentBadge(
            _podcastId
        );
        // Get the listener multiplier
        uint64 listenerBadge = listenerBadges.getBadge(_listener);
        // Mint each token for each fraction
        for (uint256 i = 0; i < _balances.length; ++i) {
            if (_balances[i].balance <= 0) {
                // Jump this iteration if the user havn't go any balance of this token types
                continue;
            }
            // Compute the amount for the owner and the users
            uint256 amountToMintOnCent = _balances[i].balance *
                tokenTypesToEarnMultiplier[_balances[i].tokenType] *
                USER_LISTEN_REWARD *
                podcastBadge *
                listenerBadge *
                _listenCount;
            // Jump this iteration if we got not token to mint
            if (amountToMintOnCent <= 0) {
                // Jump this iteration if the user havn't go any balance of this token types
                continue;
            }
            // Get the ratio between the user and the owner of the podcast (on a thousand)
            uint256 ratioOwnerUser = tokenTypesToRatio[_balances[i].tokenType];
            // Compute the right amount to mint
            uint256 amountToMint = amountToMintOnCent / 100;
            uint256 amountForListener = (amountToMint * ratioOwnerUser) / 100;
            uint256 amountForOwner = amountToMint - amountForListener;
            // Mint the TSE for the listener and the owner of the podcast
            tokenSybelEcosystem.mint(_listener, amountForListener);
            tokenSybelEcosystem.mint(podcastOwner, amountForOwner);
        }
    }

    /**
     * @dev Find the balance of the given user on each tokens
     */
    function getListenerBalanceForPodcast(address _listener, uint256 _podcastId)
        private
        view
        returns (ListenerBalanceOnPodcast[] memory, bool hasToken)
    {
        // The different types we will fetch
        uint8[] memory types = new uint8[](5);
        types[0] = SybelMath.TOKEN_TYPE_STANDART_MASK;
        types[1] = SybelMath.TOKEN_TYPE_CLASSIC_MASK;
        types[2] = SybelMath.TOKEN_TYPE_RARE_MASK;
        types[3] = SybelMath.TOKEN_TYPE_EPIC_MASK;
        types[4] = SybelMath.TOKEN_TYPE_LEGENDARY_MASK;
        // Build our initial balance map
        ListenerBalanceOnPodcast[]
            memory balances = new ListenerBalanceOnPodcast[](types.length);
        // Boolean used to know if the user have a balance
        bool hasAtLeastOneBalance = false;
        // Iterate over each types to find the balances
        for (uint8 i = 0; i < types.length; ++i) {
            // TODO : Batch balances of to be more memory efficient
            // Get the balance and build our balance on podcast object
            uint256 balance = sybelInternalTokens.balanceOf(
                _listener,
                SybelMath.buildSnftId(_podcastId, types[i])
            );
            balances[i] = ListenerBalanceOnPodcast(types[i], balance);
            // Update our has at least one balance object
            hasAtLeastOneBalance = hasAtLeastOneBalance || balance > 0;
        }
        return (balances, hasAtLeastOneBalance);
    }

    struct ListenerBalanceOnPodcast {
        uint256 tokenType;
        uint256 balance;
    }
}
