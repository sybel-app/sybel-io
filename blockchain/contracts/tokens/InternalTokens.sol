// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../utils/SybelMath.sol";
import "./ITokenProvider.sol";
import "../badges/IListenerBadges.sol";
import "../badges/IPodcastBadges.sol";
import "../utils/pausable/OwnerPausable.sol";

contract SybelFNFT is ITokenProvider, ERC1155, OwnerPausable {
    // Our base token types
    uint256 public constant TOKEN_TYPE_UTILITY = 1; // Fungible

    // The mask for the different podcast specfic types
    uint256 public constant TOKEN_TYPE_NFT_MASK = 1;
    uint256 public constant TOKEN_TYPE_EPIC_MASK = 2;
    uint256 public constant TOKEN_TYPE_RARE_MASK = 3;
    uint256 public constant TOKEN_TYPE_CLASSIC_MASK = 4;

    // The cap for each mintable token type
    uint256 public constant TOKEN_EPIC_CAP = 50;
    uint256 public constant TOKEN_RARE_CAP = 200;
    uint256 public constant TOKEN_CLASSIC_CAP = 1000;

    // The offset of the id and the mask we use to store the token type
    uint256 public constant ID_OFFSET = 4;
    uint256 public constant TYPE_MASK = 0xF;

    // The decimals for each emitted token
    uint256 public constant DECIMALS = 10**6;

    // The current podcast token id
    uint256 private _currentPodcastTokenID = 1;

    // Id of podcast to owner of podcast
    mapping(uint256 => address) public owners;

    // id of podcast to array of investor
    mapping(uint256 => address[]) public podcastInvestors;

    // Amount of nft a listener has
    mapping(address => uint256) public listenerNfts;

    // Total supply of each tokens (classic, rare and epic only) by they id
    mapping(uint256 => uint256) public tokenSupplies;

    // Available supply of each tokens (classic, rare and epic only) by they id
    mapping(uint256 => uint256) public availableSupplies;

    /**
     * @dev Access our listener badges
     */
    IListenerBadges public listenerBadges;

    /**
     * @dev Access our podcast badges
     */
    IPodcastBadges public podcastBadges;

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

    constructor(address listenerBadgesAddr, address podcastBadgesAddr)
        ERC1155("https://sybel-io-fnft.s3.eu-west-1.amazonaws.com/{id}.json")
    {
        // Set the address used to access listener and podcast badges
        listenerBadges = IListenerBadges(listenerBadgesAddr);
        podcastBadges = IPodcastBadges(podcastBadgesAddr);
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
    ) external override onlyOwner whenNotPaused returns (uint256) {
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
        uint256 id = _getNextTokenID();
        _incrementPodcastTokenID();

        // Mint the podcast nft into the podcast owner wallet directly
        _mint(
            _podcastOwnerAddress,
            SybelMath.buildSnftId(id, TOKEN_TYPE_NFT_MASK),
            1,
            _data
        );

        // Save the supplies for each token types
        tokenSupplies[
            SybelMath.buildSnftId(id, TOKEN_TYPE_CLASSIC_MASK)
        ] = _classicSupply;
        availableSupplies[
            SybelMath.buildSnftId(id, TOKEN_TYPE_CLASSIC_MASK)
        ] = _classicSupply;

        tokenSupplies[
            SybelMath.buildSnftId(id, TOKEN_TYPE_RARE_MASK)
        ] = _rareSupply;
        availableSupplies[
            SybelMath.buildSnftId(id, TOKEN_TYPE_RARE_MASK)
        ] = _rareSupply;

        tokenSupplies[
            SybelMath.buildSnftId(id, TOKEN_TYPE_EPIC_MASK)
        ] = _epicSupply;
        availableSupplies[
            SybelMath.buildSnftId(id, TOKEN_TYPE_EPIC_MASK)
        ] = _epicSupply;

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
            if (_isPodcastRelatedToken(ids[i])) {
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
        address,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory
    ) internal override {
        // In the case we are sending the token to a given wallet
        for (uint256 i = 0; i < ids.length; ++i) {
            // Handling investor array update, and token supplies
            if (_isPodcastRelatedToken(ids[i])) {
                // If this token is a podcast related one (so classic, rare or epic)
                uint256 podcastId = SybelMath.extractPodcastId(ids[i]);
                // If we got a to address (so not a burn token)
                if (to != address(0)) {
                    // Add this listener as an investor of this podcast
                    _addInvestorOnce(podcastInvestors[podcastId], to);
                    // Update the number of token held by this listener
                    listenerNfts[from] += amounts[i];
                }
                // If we got a from address,so not a minted token
                if (from != address(0)) {
                    // Remove the from address from the wallet investor
                    _removeInvestorOnce(podcastInvestors[podcastId], from);
                    // Update the number of token held by this listener
                    listenerNfts[from] -= amounts[i];
                } else {
                    // Update the token available supplies (cause if the from is address 0, it's mean we have mint this token)
                    // Only perform the update for podcast related token, since we don't need to know the supply of all the other token
                    availableSupplies[ids[i]] -= amounts[i];
                }
            } else if (_isPodcastNft(ids[i])) {
                // If this token is a podcast NFT, change the owner of this podcast
                uint256 podcastId = SybelMath.extractPodcastId(ids[i]);
                owners[podcastId] = to;
                emit PodcastOwnerChanged(podcastId, from, to);
            }
        }
    }

    /**
     * @dev calculates the next token ID based on value of _currentTokenID
     * @return uint256 for the next token ID
     */
    function _getNextTokenID() private view returns (uint256) {
        return _currentPodcastTokenID + 1;
    }

    /**
     * @dev increments the value of _currentTokenID
     */
    function _incrementPodcastTokenID() private {
        _currentPodcastTokenID++;
    }

    /**
     * @dev Check if the given token exist
     * @param _id uint256 ID of the token to check
     * @return bool true if the token is related to a podcast, false otherwise
     */
    function _isPodcastRelatedToken(uint256 _id) private pure returns (bool) {
        uint256 tokenType = SybelMath.extractTokenType(_id);
        return
            tokenType > TOKEN_TYPE_NFT_MASK &&
            tokenType <= TOKEN_TYPE_CLASSIC_MASK;
    }

    /**
     * @dev Check if the given token id is a podcast NFT
     * @param _id uint256 ID of the token to check
     * @return bool true if the token is a podcast nft, false otherwise
     */
    function _isPodcastNft(uint256 _id) private pure returns (bool) {
        return SybelMath.extractTokenType(_id) == TOKEN_TYPE_NFT_MASK;
    }

    /**
     * @dev Remove an investor from the investor array
     */
    function _removeInvestorOnce(
        address[] storage _investors,
        address _investorAddress
    ) private {
        // Iterate over it to find all the time the investor is mentionned
        for (uint256 i = 0; i < _investors.length; ++i) {
            // If we found it, remove it from the array and exit (only remove it once)
            if (_investors[i] == _investorAddress) {
                _investors[i] = _investors[_investors.length - 1];
                _investors.pop();
                return;
            }
        }
    }

    /**
     * @dev Add an investor to the investor array (if he isn't present yet)
     */
    function _addInvestorOnce(
        address[] storage _investors,
        address _investorAddress
    ) private {
        // Check if the investor is already present in the investor array
        bool isAlreadyAnInvestor = false;
        // Iterate over it to find all the time the investor is mentionned
        for (uint256 i = 0; i < _investors.length; ++i) {
            // Update our already investor address
            isAlreadyAnInvestor =
                isAlreadyAnInvestor ||
                _investors[i] == _investorAddress;
        }
        if (!isAlreadyAnInvestor) {
            // If the user wasn't already an investor of this podcast, add it to the array
            _investors.push(_investorAddress);
        }
    }
}
