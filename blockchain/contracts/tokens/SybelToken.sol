// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "../utils/SybelMath.sol";
import "../utils/MintingAccessControlUpgradeable.sol";

/// @custom:security-contact crypto-support@sybel.co
/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract SybelToken is ERC20Upgradeable, MintingAccessControlUpgradeable {
    uint256 private _cap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC20_init("Sybel Token", "SYBL");
        __MintingAccessControlUpgradeable_init();

        _cap = 3000000000 ether; // 3 billion SYBL
    }

    /**
     * @dev Mint some SYBL
     */
    function mint(address to, uint256 amount)
        external
        onlyRole(SybelRoles.MINTER)
    {
        require(totalSupply() + amount <= cap(), "ERC20Capped: cap exceeded");
        _mint(to, amount);
    }

    /**
     * @dev Transfer some SYBL
     */
    function transfer(
        address from,
        address to,
        uint256 amount
    ) external onlyRole(SybelRoles.MINTER) {
        _transfer(from, to, amount);
    }

    /**
     * @dev Burn some SYBL
     */
    function burn(address from, uint256 amount)
        external
        onlyRole(SybelRoles.MINTER)
    {
        _burn(from, amount);
    }

    /**
     * @dev Ensure the contract isn't paused before the transfer
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    /**
     * @dev Returns the cap on the token's total supply.
     */
    function cap() public view virtual returns (uint256) {
        return _cap;
    }
}
