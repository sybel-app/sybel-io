// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./IRewarder.sol";
import "../badges/access/PaymentBadgesAccessor.sol";
import "../utils/SybelMath.sol";
import "../utils/SybelRoles.sol";
import "../tokens/SybelInternalTokens.sol";
import "../tokens/SybelToken.sol";
import "../utils/SybelAccessControlUpgradeable.sol";

/**
 * @dev Represent our rewarder contract
 */
/// @custom:security-contact crypto-support@sybel.co
contract Rewarder is
    IRewarder,
    SybelAccessControlUpgradeable,
    PaymentBadgesAccessor
{
    // Maximum data we can treat in a batch manner
    uint8 private constant MAX_BATCH_AMOUNT = 20;

    /**
     * @dev Access our internal tokens
     */
    SybelInternalTokens private sybelInternalTokens;

    /**
     * @dev Access our governance token
     */
    SybelToken private sybelToken;

    /**
     * @dev Event emitted when a user is rewarded for his listen
     */
    event UserRewarded(
        uint256 podcastId,
        address user,
        uint256 listenCount,
        uint256 amountPaid,
        ListenerBalanceOnPodcast[] listenerBalance
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address syblTokenAddr,
        address internalTokenAddr,
        address listenerBadgesAddr,
        address podcastBadgesAddr
    ) public initializer {
        __SybelAccessControlUpgradeable_init();
        __PaymentBadgesAccessor_init(listenerBadgesAddr, podcastBadgesAddr);

        sybelInternalTokens = SybelInternalTokens(internalTokenAddr);
        sybelToken = SybelToken(syblTokenAddr);

        // Grant the rewarder role to the contract deployer
        _grantRole(SybelRoles.REWARDER, msg.sender);
    }

    function updateSybTokenAddr(address sybelTokenAddr)
        external
        onlyRole(SybelRoles.ADMIN)
    {
        sybelToken = SybelToken(sybelTokenAddr);
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
        uint8[] memory types = SybelMath.payableTokenTypes();
        // Build the ids for eachs types
        uint256[] memory tokenIds = SybelMath.buildSnftIds(_podcastId, types);
        // Build our initial balance map
        ListenerBalanceOnPodcast[]
            memory balances = new ListenerBalanceOnPodcast[](types.length);
        // Boolean used to know if the user have a balance
        bool hasAtLeastOneBalance = false;
        // Iterate over each types to find the balances
        for (uint8 i = 0; i < types.length; ++i) {
            // TODO : Batch balances of to be more gas efficient ??
            // Get the balance and build our balance on podcast object
            uint256 balance = sybelInternalTokens.balanceOf(
                _listener,
                tokenIds[i]
            );
            balances[i] = ListenerBalanceOnPodcast(types[i], balance);
            // Update our has at least one balance object
            hasAtLeastOneBalance = hasAtLeastOneBalance || balance > 0;
        }
        return (balances, hasAtLeastOneBalance);
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
            // If no balance mint a Standard NFT
            if (!hasAtLeastOneBalance) {
                sybelInternalTokens.mint(
                    _listener,
                    SybelMath.buildStandardNftId(_podcastIds[i]),
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
        uint64 podcastBadge = podcastBadges.getBadge(_podcastId);
        // Amout we will mint for user and for owner
        uint256 totalAmountToMint = 0;
        // Mint each token for each fraction
        for (uint256 i = 0; i < _balances.length; ++i) {
            if (_balances[i].balance <= 0) {
                // Jump this iteration if the user havn't go any balance of this token types
                continue;
            }
            // Compute the amount for the owner and the users
            totalAmountToMint +=
                (_balances[i].balance *
                    baseRewardForTokenType(_balances[i].tokenType) *
                    podcastBadge *
                    _listenCount) /
                1 ether;
        }
        // If nothing to mint, directly exit
        if (totalAmountToMint == 0) {
            return;
        }
        uint256 amountForOwner = totalAmountToMint / 2;
        uint256 baseAmountForListener = totalAmountToMint - amountForOwner;
        // Handle the user badge for his amount
        uint64 listenerBadge = listenerBadges.getBadge(_listener);
        uint256 amountForListener = (baseAmountForListener * listenerBadge) /
            1 ether;
        // Mint the SYBL for the listener
        sybelToken.mint(_listener, amountForListener);
        // Mint the SYBL for the owner
        address podcastOwner = sybelInternalTokens.ownerOf(_podcastId);
        sybelToken.mint(podcastOwner, amountForOwner);
        // Emit the reward event
        emit UserRewarded(
            _podcastId,
            _listener,
            _listenCount,
            amountForListener,
            _balances
        );
    }

    /**
     * @dev Get the base reward to the given token type
     * We use a pure function instead of a mapping to economise on storage read, and since this reawrd shouldn't evolve really fast
     */
    function baseRewardForTokenType(uint8 _tokenType)
        private
        pure
        returns (uint96)
    {
        uint96 reward = 0;
        if (_tokenType == SybelMath.TOKEN_TYPE_STANDARD_MASK) {
            reward = 0.01 ether; // 0.01 SYBL
        } else if (_tokenType == SybelMath.TOKEN_TYPE_CLASSIC_MASK) {
            reward = 0.1 ether; // 0.1 SYBL
        } else if (_tokenType == SybelMath.TOKEN_TYPE_RARE_MASK) {
            reward = 0.5 ether; // 0.5 SYBL
        } else if (_tokenType == SybelMath.TOKEN_TYPE_EPIC_MASK) {
            reward = 1 ether; // 1 SYBL
        } else if (_tokenType == SybelMath.TOKEN_TYPE_LEGENDARY_MASK) {
            reward = 2 ether; // 2 SYBL
        }
        return reward;
    }

    struct ListenerBalanceOnPodcast {
        uint8 tokenType;
        uint256 balance;
    }
}
