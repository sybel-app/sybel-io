// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../utils/SybelMath.sol";
import "../utils/SybelRoles.sol";
import "../utils/pausable/AccessControlPausable.sol";
import "../updater/IUpdater.sol";

contract InternalTokens is ERC1155, AccessControlPausable {
    // Base token type
    uint256 public constant TOKEN_TYPE_UTILITY = 0; // Fungible

    // The cap for each mintable token type
    uint256 public constant TOKEN_EPIC_CAP = 50;
    uint256 public constant TOKEN_RARE_CAP = 200;
    uint256 public constant TOKEN_CLASSIC_CAP = 1000;

    // The decimals for each emitted token
    uint256 public constant DECIMALS = 10**6;

    // The current podcast token id
    uint256 private _currentPodcastTokenID = 1;

    // Total supply of each tokens (classic, rare and epic only) by they id
    mapping(uint256 => uint256) public tokenSupplies;

    // Available supply of each tokens (classic, rare and epic only) by they id
    mapping(uint256 => uint256) public availableSupplies;

    // Access our updater contract
    IUpdater private updater;

    // Event when podcast is published
    event PodcastMinted(
        uint256 baseId,
        uint256 classicAmount,
        uint256 rareAmount,
        uint256 epicAmount,
        address owner
    );

    // Event when podcast owner changed
    event PodcastOwnerChanged(uint256 podcastId, address from, address to);

    constructor()
        ERC1155("https://sybel-io-fnft.s3.eu-west-1.amazonaws.com/{id}.json")
    {}

    /**
     * @dev Update the updater address
     */
    function updateUpdaterAddr(address newAddress)
        external
        onlyRole(SybelRoles.ADDRESS_UPDATER)
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
        bytes calldata _data,
        address _podcastOwnerAddress
    ) external onlyRole(SybelRoles.MINTER) whenNotPaused returns (uint256) {
        require(
            _classicSupply > 0,
            "SYB: Cannot add podcast without classic supply !"
        );
        require(
            _classicSupply <= TOKEN_CLASSIC_CAP,
            "SYB: Cannot add podcast with that much classic supply !"
        );
        require(
            _rareSupply <= TOKEN_RARE_CAP,
            "SYB: Cannot add podcast with that much rare supply !"
        );
        require(
            _epicSupply <= TOKEN_EPIC_CAP,
            "SYB: Cannot add podcast with that much epic supply !"
        );

        // Get the next podcast id and increment the current podcast token id
        uint256 id = _currentPodcastTokenID + 1;
        _currentPodcastTokenID++;

        // Mint the podcast nft into the podcast owner wallet directly
        tokenSupplies[SybelMath.buildNftId(id)] = 1;
        availableSupplies[SybelMath.buildNftId(id)] = 1;
        _mint(_podcastOwnerAddress, SybelMath.buildNftId(id), 1, _data);

        // Save the supplies for each token types
        tokenSupplies[SybelMath.buildClassicNftId(id)] = _classicSupply;
        availableSupplies[SybelMath.buildClassicNftId(id)] = _classicSupply;

        tokenSupplies[SybelMath.buildRareNftId(id)] = _rareSupply;
        availableSupplies[SybelMath.buildRareNftId(id)] = _rareSupply;

        tokenSupplies[SybelMath.buildEpicNftId(id)] = _epicSupply;
        availableSupplies[SybelMath.buildEpicNftId(id)] = _epicSupply;

        // Emit that our podcast is now minted
        emit PodcastMinted(
            id,
            _classicSupply,
            _rareSupply,
            _epicSupply,
            _podcastOwnerAddress
        );

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
    ) internal view override {
        for (uint256 i = 0; i < ids.length; ++i) {
            if (SybelMath.isPodcastRelatedToken(ids[i])) {
                // Ensure we got enought supply before minting the token
                if (from == address(0)) {
                    require(
                        amounts[i] < availableSupplies[ids[i]],
                        "SYB: Not enough available supply for mint"
                    );
                }
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
                availableSupplies[ids[i]] -= amounts[i];
            } else if (to == address(0)) {
                // Update the supply by adding the amount of token burned
                availableSupplies[ids[i]] += amounts[i];
            }
        }
    }

    /**
     * @dev Mint new utility token to the given addresses for the given amount
     */
    function mintUtility(address _to, uint256 _amount)
        external
        onlyRole(SybelRoles.MINTER)
        whenNotPaused
    {
        _mint(_to, TOKEN_TYPE_UTILITY, _amount, new bytes(0x0));
    }

    /**
     * @dev Mint new utility token to the given addresses for the given amount
     */
    function burnUtility(address _from, uint256 _amount)
        external
        onlyRole(SybelRoles.MINTER)
        whenNotPaused
    {
        _burn(_from, TOKEN_TYPE_UTILITY, _amount);
    }

    /**
     * @dev Mint a new fraction of a nft
     */
    function mintSNft(
        address _to,
        uint256 _id,
        uint256 _amount
    ) external onlyRole(SybelRoles.MINTER) whenNotPaused {
        require(
            SybelMath.isPodcastRelatedToken(_id),
            "SYB: Asked to mint S NFT but sent a non podcast id"
        );
        _mint(_to, _id, _amount, new bytes(0x0));
    }

    /**
     * @dev Burn a fraction of a nft
     */
    function burnSNft(
        address _from,
        uint256 _id,
        uint256 _amount
    ) external onlyRole(SybelRoles.MINTER) whenNotPaused {
        require(
            SybelMath.isPodcastRelatedToken(_id),
            "SYB: Asked to burn S NFT but sent a non podcast id"
        );
        _burn(_from, _id, _amount);
    }

    /**
     * @dev Required extension to support access control and ERC1155
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
