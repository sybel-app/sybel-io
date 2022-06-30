// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./IFractionCostBadges.sol";
import "../../utils/SybelMath.sol";
import "../../utils/SybelRoles.sol";
import "../../utils/SybelAccessControlUpgradeable.sol";

/**
 * @dev Handle the computation of our listener badges
 */
/// @custom:security-contact crypto-support@sybel.co
contract FractionCostBadges is
    IFractionCostBadges,
    SybelAccessControlUpgradeable
{
    // Map f nft id to cost badge
    mapping(uint256 => uint64) fractionBadges;

    // Initial fractions badges per token types
    mapping(uint8 => uint64) initialFractionBadges;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __SybelAccessControlUpgradeable_init();

        // Build initial badges for each token types
        initialFractionBadges[SybelMath.TOKEN_TYPE_STANDART_MASK] = 0; // 0 TSE
        initialFractionBadges[SybelMath.TOKEN_TYPE_CLASSIC_MASK] = 500000; // 0.5 TSE
        initialFractionBadges[SybelMath.TOKEN_TYPE_RARE_MASK] =
            2 *
            SybelMath.DECIMALS; // 2 TSE
        initialFractionBadges[SybelMath.TOKEN_TYPE_EPIC_MASK] =
            5 *
            SybelMath.DECIMALS; // 5 TSE
        initialFractionBadges[SybelMath.TOKEN_TYPE_LEGENDARY_MASK] =
            10 *
            SybelMath.DECIMALS; // 10 TSE

        // Grant the badge updater role to the contract deployer
        _grantRole(SybelRoles.BADGE_UPDATER, msg.sender);
    }

    /**
     * @dev Update the podcast internal coefficient
     */
    function updateBadge(uint256 _fractionId, uint64 _badge)
        external
        override
        onlyRole(SybelRoles.BADGE_UPDATER)
        whenNotPaused
    {
        fractionBadges[_fractionId] = _badge;
    }

    /**
     * @dev Get the payment badges for the given informations
     */
    function getBadge(uint256 _fractionId)
        external
        view
        override
        whenNotPaused
        returns (uint64)
    {
        uint64 fractionBadge = fractionBadges[_fractionId];
        if (fractionBadge == 0) {
            // If the badge of this fraction isn't set yet, set it to default
            uint8 tokenType = SybelMath.extractTokenType(_fractionId);
            fractionBadge = initialFractionBadges[tokenType];
        }
        return fractionBadge;
    }
}
