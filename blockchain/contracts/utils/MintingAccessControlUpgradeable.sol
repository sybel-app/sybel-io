// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./IPausable.sol";
import "./SybelAccessControlUpgradeable.sol";
import "../utils/SybelRoles.sol";

/// @custom:security-contact crypto-support@sybel.co
abstract contract MintingAccessControlUpgradeable is
    SybelAccessControlUpgradeable
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public virtual override initializer {
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
