// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./IRewarder.sol";
import "../badges/access/PaymentBadgesAccessor.sol";
import "../utils/SybelMath.sol";
import "../utils/SybelRoles.sol";
import "../tokens/SybelInternalTokens.sol";
import "../tokens/TokenSybelEcosystem.sol";
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
    TokenSybelEcosystem private tokenSybelEcosystem;

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
        address tseAddr,
        address internalTokenAddr,
        address listenerBadgesAddr,
        address podcastBadgesAddr
    ) public initializer {
        __SybelAccessControlUpgradeable_init();
        __PaymentBadgesAccessor_init(listenerBadgesAddr, podcastBadgesAddr);

        sybelInternalTokens = SybelInternalTokens(internalTokenAddr);
        tokenSybelEcosystem = TokenSybelEcosystem(tseAddr);

        // Grant the rewarder role to the contract deployer
        _grantRole(SybelRoles.REWARDER, msg.sender);
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
        // uint64 listenerBadge = listenerBadges.getBadge(_listener);
        // Amout we will mint for user and for owner
        uint256 amountForListener = 0;
        uint256 amountForOwner = 0;
        // Mint each token for each fraction
        for (uint256 i = 0; i < _balances.length; ++i) {
            if (_balances[i].balance <= 0) {
                // Jump this iteration if the user havn't go any balance of this token types
                continue;
            }
            // Compute the amount for the owner and the users
            uint256 amountToMint = (_balances[i].balance *
                baseRewardForTokenType(_balances[i].tokenType) *
                podcastBadge *
                _listenCount) / SybelMath.DECIMALS;
            // Jump this iteration if we got not token to mint
            if (amountToMint <= 0) {
                // Jump this iteration if the user havn't go any balance of this token types
                continue;
            }

            // Get the ratio between the user and the owner of the podcast (on a thousand)
            uint256 ratioOwnerUser = ratioForTokenTypeOnAThousand(
                _balances[i].tokenType
            );
            // Compute the right amount to mint
            amountForListener += (amountToMint * ratioOwnerUser) / 1000;
            amountForOwner += amountToMint - amountForListener;
        }
        // Mint the TSE for the listener and the owner of the podcast
        tokenSybelEcosystem.mint(_listener, amountForListener);
        tokenSybelEcosystem.mint(podcastOwner, amountForOwner);
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
        returns (uint32)
    {
        uint32 reward;
        if (_tokenType == SybelMath.TOKEN_TYPE_STANDART_MASK) {
            reward = 10000; // 0.01 TSE
        } else if (_tokenType == SybelMath.TOKEN_TYPE_CLASSIC_MASK) {
            reward = 100000; // 0.1 TSE
        } else if (_tokenType == SybelMath.TOKEN_TYPE_RARE_MASK) {
            reward = 500000; // 0.5 TSE
        } else if (_tokenType == SybelMath.TOKEN_TYPE_EPIC_MASK) {
            reward = 1000000; // 1 TSE
        } else if (_tokenType == SybelMath.TOKEN_TYPE_LEGENDARY_MASK) {
            reward = 2000000; // 2 TSE
        }
        return reward;
    }

    /**
     * @dev Get the ratio between user and owner for the given token type
     * We use a pure function instead of a mapping to economise on storage read, and since this reawrd shouldn't evolve really fast
     */
    function ratioForTokenTypeOnAThousand(uint8 _tokenType)
        private
        pure
        returns (uint16)
    {
        uint16 ratio;
        if (_tokenType == SybelMath.TOKEN_TYPE_STANDART_MASK) {
            ratio = 1; // 0.1%
        } else if (_tokenType == SybelMath.TOKEN_TYPE_CLASSIC_MASK) {
            ratio = 50; // 5%
        } else if (_tokenType == SybelMath.TOKEN_TYPE_RARE_MASK) {
            ratio = 100; // 10%
        } else if (_tokenType == SybelMath.TOKEN_TYPE_EPIC_MASK) {
            ratio = 250; // 25%
        } else if (_tokenType == SybelMath.TOKEN_TYPE_LEGENDARY_MASK) {
            ratio = 500; // 50%
        }
        return ratio;
    }

    struct ListenerBalanceOnPodcast {
        uint8 tokenType;
        uint256 balance;
    }
}
