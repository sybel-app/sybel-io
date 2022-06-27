// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../utils/SybelMath.sol";
import "../utils/MintingAccessControlUpgradeable.sol";
import "../updater/IUpdater.sol";

/// @custom:security-contact crypto-support@sybel.co
contract SybelInternalTokens is
    Initializable,
    ERC1155Upgradeable,
    MintingAccessControlUpgradeable
{
    // The current podcast token id
    uint256 private _currentPodcastTokenID = 1;

    // Available supply of each tokens (classic, rare and epic only) by they id
    mapping(uint256 => uint256) private _availableSupplies;

    // Access our updater contract
    IUpdater private updater;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public override initializer {
        __ERC1155_init(
            "https://sybel-io-fnft.s3.eu-west-1.amazonaws.com/{id}.json"
        );
        super.initialize();
    }

    /**
     * @dev Update the updater address
     */
    function updateUpdaterAddr(address newAddress)
        external
        onlyUpgrader
        whenNotPaused
    {
        updater = IUpdater(newAddress);
    }

    /**
     * @dev Mint a new podcast, return the id of the built podcast
     */
    function mintPodcast(
        uint256 _classicSupply,
        uint256 _rareSupply,
        uint256 _epicSupply,
        uint256 _legendarySupply,
        bytes calldata _data,
        address _podcastOwnerAddress
    ) external onlyMinter whenNotPaused returns (uint256) {
        // Get the next podcast id and increment the current podcast token id
        uint256 id = _currentPodcastTokenID + 1;
        _currentPodcastTokenID++;

        // Mint the podcast nft into the podcast owner wallet directly
        _availableSupplies[SybelMath.buildNftId(id)] = 1;
        _mint(_podcastOwnerAddress, SybelMath.buildNftId(id), 1, _data);

        // Save the supplies for each token types
        _availableSupplies[SybelMath.buildClassicNftId(id)] = _classicSupply;
        _availableSupplies[SybelMath.buildRareNftId(id)] = _rareSupply;
        _availableSupplies[SybelMath.buildEpicNftId(id)] = _epicSupply;
        _availableSupplies[
            SybelMath.buildLegendaryNftId(id)
        ] = _legendarySupply;

        // Return the podcast id
        return id;
    }

    /**
     * @dev Perform some check before the transfer token
     */
    function _beforeTokenTransfer(
        address,
        address from,
        address,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory
    ) internal view override whenNotPaused {
        for (uint256 i = 0; i < ids.length; ++i) {
            // Ensure we got enought supply before minting the token
            if (from == address(0)) {
                require(
                    amounts[i] < _availableSupplies[ids[i]],
                    "SYB: Not enough available supply for mint"
                );
            }
        }
    }

    /**
     * @dev Handle the transfer token (so update the podcast investor, change the owner of some podcast etc)
     */
    function _afterTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory
    ) internal override {
        // Handle the badges updates
        updater.updateFromTransaction(operator, from, to, ids, amounts);
        // In the case we are sending the token to a given wallet
        for (uint256 i = 0; i < ids.length; ++i) {
            // If we got a from address,so not a minted token
            if (from == address(0)) {
                // Update the token available supplies (cause if the from is address 0, it's mean we have mint this token)
                // Only perform the update for podcast related token, since we don't need to know the supply of all the other token
                _availableSupplies[ids[i]] -= amounts[i];
            } else if (to == address(0)) {
                // Update the supply by adding the amount of token burned
                _availableSupplies[ids[i]] += amounts[i];
            }
        }
    }

    /**
     * @dev Mint a new fraction of a nft
     */
    function mint(
        address _to,
        uint256 _id,
        uint256 _amount
    ) external onlyMinter whenNotPaused {
        _mint(_to, _id, _amount, new bytes(0x0));
    }

    /**
     * @dev Burn a fraction of a nft
     */
    function burn(
        address _from,
        uint256 _id,
        uint256 _amount
    ) external onlyMinter whenNotPaused {
        _burn(_from, _id, _amount);
    }

    /**
     * @dev Required extension to support access control and ERC1155
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
