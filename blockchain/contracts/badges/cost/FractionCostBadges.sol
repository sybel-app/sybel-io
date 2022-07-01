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

    event FractionCostBadgeUpdated(uint256 id, uint64 badge);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __SybelAccessControlUpgradeable_init();

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
        emit FractionCostBadgeUpdated(_fractionId, _badge);
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
            fractionBadge = initialFractionCost(tokenType);
        }
        return fractionBadge;
    }

    /**
     * @dev The initial cost of a fraction type
     * We use a pure function instead of a mapping to economise on storage read, and since this reawrd shouldn't evolve really fast
     */
    function initialFractionCost(uint8 _tokenType)
        public
        pure
        returns (uint32)
    {
        uint32 initialCost;
        if (_tokenType == SybelMath.TOKEN_TYPE_CLASSIC_MASK) {
            initialCost = 500000; // 0.5 TSE
        } else if (_tokenType == SybelMath.TOKEN_TYPE_RARE_MASK) {
            initialCost = 2000000; // 2 TSE
        } else if (_tokenType == SybelMath.TOKEN_TYPE_EPIC_MASK) {
            initialCost = 5000000; // 5 TSE
        } else if (_tokenType == SybelMath.TOKEN_TYPE_LEGENDARY_MASK) {
            initialCost = 10000000; // 10 TSE
        }
        return initialCost;
    }
}
