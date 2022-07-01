// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "../utils/SybelMath.sol";
import "../utils/MintingAccessControlUpgradeable.sol";
import "../updater/IUpdater.sol";

/// @custom:security-contact crypto-support@sybel.co
/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract SybelInternalTokens is
    ERC1155Upgradeable,
    MintingAccessControlUpgradeable
{
    // The current podcast token id
    uint256 private _currentPodcastTokenID;

    // Available supply of each tokens (classic, rare and epic only) by they id
    mapping(uint256 => uint256) private _availableSupplies;

    // Tell us if that token is supply aware or not
    mapping(uint256 => bool) private _isSupplyAware;

    // Access our updater contract
    IUpdater private updater;

    /**
     * @dev Event emitted when a new fraction of podcast is minted
     */
    event SuplyUpdated(uint256 id, uint256 supply);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC1155_init(
            "https://sybel-io-fnft.s3.eu-west-1.amazonaws.com/{id}.json"
        );
        __MintingAccessControlUpgradeable_init();

        // Set the initial podcast id
        _currentPodcastTokenID = 1;
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
    function mintNewPodcast(address _podcastOwnerAddress)
        external
        onlyMinter
        whenNotPaused
        returns (uint256)
    {
        // Get the next podcast id and increment the current podcast token id
        uint256 id = _currentPodcastTokenID + 1;
        _currentPodcastTokenID++;

        // Mint the podcast nft into the podcast owner wallet directly
        uint256 nftId = SybelMath.buildNftId(id);
        _isSupplyAware[nftId] = true;
        _availableSupplies[nftId] = 1;
        _mint(_podcastOwnerAddress, nftId, 1, new bytes(0x0));

        // Return the podcast id
        return id;
    }

    /**
     * @dev Set the supply for each token ids
     */
    function setSupplyBatch(
        uint256[] calldata _ids,
        uint256[] calldata _supplies
    ) external onlyMinter whenNotPaused {
        require(
            _ids.length == _supplies.length,
            "SYB: Can't set the supply for id and supplies of different length"
        );
        // Iterate over each ids
        for (uint256 i = 0; i < _ids.length; ++i) {
            _availableSupplies[_ids[i]] = _supplies[i];
            _isSupplyAware[_ids[i]] = true;
            // Emit the supply update event
            emit SuplyUpdated(_ids[i], _supplies[i]);
        }
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
            if (from == address(0) && _isSupplyAware[ids[i]]) {
                require(
                    amounts[i] <= _availableSupplies[ids[i]],
                    "SYB: Not enough available supply for mint for id"
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
            bool isSupplyAware = _isSupplyAware[ids[i]];
            if (from == address(0) && isSupplyAware) {
                // If it's a minted token
                _availableSupplies[ids[i]] -= amounts[i];
            } else if (to == address(0) && isSupplyAware) {
                // If it's a burned token
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
