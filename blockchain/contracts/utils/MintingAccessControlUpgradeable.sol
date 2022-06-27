// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./SybelAccessControlUpgradeable.sol";
import "../utils/SybelRoles.sol";

/// @custom:security-contact crypto-support@sybel.co
abstract contract MintingAccessControlUpgradeable is
    SybelAccessControlUpgradeable
{
    function initialize() public virtual override {
        super.initialize();

        _grantRole(SybelRoles.MINTER, msg.sender);
    }

    /**
     * @dev Allow only the minter role
     */
    modifier onlyMinter() {
        _checkRole(SybelRoles.MINTER);
        _;
    }
}
