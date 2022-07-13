// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "../utils/SybelMath.sol";
import "../utils/MintingAccessControlUpgradeable.sol";

/// @custom:security-contact crypto-support@sybel.co
/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract TokenSybelEcosystem is
    ERC20Upgradeable,
    MintingAccessControlUpgradeable
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC20_init("Token Sybel Ecosystem", "TSE");
        __MintingAccessControlUpgradeable_init();
    }

    function decimals() public pure override returns (uint8) {
        return SybelMath.DECIMALS_COUNT;
    }

    /**
     * @dev Mint some TSE
     */
    function mint(address to, uint256 amount)
        public
        onlyRole(SybelRoles.MINTER)
    {
        _mint(to, amount);
    }

    /**
     * @dev Transfer some TSE
     */
    function transfer(
        address from,
        address to,
        uint256 amount
    ) public onlyRole(SybelRoles.MINTER) {
        _transfer(from, to, amount);
    }

    /**
     * @dev Burn some TSE
     */
    function burn(address from, uint256 amount)
        public
        onlyRole(SybelRoles.MINTER)
    {
        _burn(from, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
}
