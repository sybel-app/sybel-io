// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/finance/PaymentSplitterUpgradeable.sol";
import "../badges/access/PaymentBadgesAccessor.sol";
import "../utils/SybelMath.sol";
import "../utils/SybelRoles.sol";
import "../tokens/SybelInternalTokens.sol";
import "../tokens/SybelToken.sol";
import "../utils/SybelAccessControlUpgradeable.sol";

/**
 * @dev Represent our foundation wallet contract
 */
/// @custom:security-contact crypto-support@sybel.co
contract FoundationWallet is
    PaymentSplitterUpgradeable,
    SybelAccessControlUpgradeable
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() external initializer {
        __SybelAccessControlUpgradeable_init();

        // TODO : Here we should build our initial payee and shares informations, this can't be modifier in the future
        address[] memory initialPayee = new address[](0);
        uint256[] memory initialSharee = new uint256[](0);
        __PaymentSplitter_init(initialPayee, initialSharee);

        // Grant the rewarder role to the contract deployer
        _grantRole(SybelRoles.REWARDER, msg.sender);
    }
}
