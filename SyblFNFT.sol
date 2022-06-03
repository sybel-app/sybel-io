// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract SybelFNFT is ERC1155, Ownable {
    // Our base token types
    uint256 public constant TOKEN_TYPE_UTILITY = 0; // Fungible
    uint256 public constant TOKEN_TYPE_GOVERNANCE = 1; // Fungible

    // The mask for the different podcast specfic types
    uint256 public constant TOKEN_TYPE_NFT_MASK = 1;
    uint256 public constant TOKEN_TYPE_EPIC_MASK = 2;
    uint256 public constant TOKEN_TYPE_RARE_MASK = 3;
    uint256 public constant TOKEN_TYPE_CLASSIC_MASK = 4;

    // The offset of the id and the mask we use to store the token type
    uint256 public constant ID_OFFSET = 4;
    uint256 public constant TYPE_MASK = 0xF;

    // The current podcast token id
    uint256 private _currentPodcastTokenID = 1;

    // Id to owner of podcast
    mapping(uint256 => address) public owners;

    // Podcaster address to their podcast id's
    mapping(address => uint256[]) public ownersToPodcast;

    // Array of unpaid listeners per podcast
    mapping(uint256 => address[]) public unpaidListeners;

    // Number of listen per address on a given podcast (so listenCount[_podcastId][_unpaidListenerAddress])
    mapping(uint256 => mapping(address => uint256)) public listenCount;

    // Investor on a podast
    mapping(uint256 => address[]) public podcastInvestors;

    // Supply of each tokens
    mapping(uint256 => uint256) public tokenSupplies;

    // Event when podcast is published
    event PodcastPublished(
        uint256 baseId,
        uint256 classicAmount,
        uint256 rareAmount,
        uint256 epicAmount,
        string name,
        address owner
    );

    constructor()
        ERC1155("https://sybel-io-fnft.s3.eu-west-1.amazonaws.com/{id}.json")
    {
        // Mint all of our TOKEN_TYPE_GOVERNANCE token (3 billion)
        _mint(msg.sender, TOKEN_TYPE_GOVERNANCE, 3000000000, "");
    }

    /**
     * @dev Add a new podcast to this contract, and then build the associated NFT, and fungible participation of this NFT (so epic, rare, normal) given the supply
     */
    function addPodcast(
        uint256 _classicSupply,
        uint256 _rareSupply,
        uint256 _epicSupply,
        string memory _name,
        bytes calldata _data,
        address _podcastOwnerAddress
    ) public onlyOwner {
        require(
            _classicSupply > 0,
            "Cannot add podcast without classic supply !"
        );

        // Get the next podcast id and increment the current podcast token id
        uint256 _id = _getNextTokenID();
        _incrementPodcastTokenID();
        owners[_id] = _podcastOwnerAddress;

        // Give the podcast owner 1000 utility token
        _mint(_podcastOwnerAddress, TOKEN_TYPE_UTILITY, 1000, _data);

        // TODO : Should give him governance token, respecting Matt calculation system

        // Mint the podcast nft into the podcast owner wallet directly
        _mint(
            _podcastOwnerAddress,
            _createTypedId(_id, TOKEN_TYPE_NFT_MASK),
            1,
            _data
        );

        // Mint all the fraction of this token into the owner wallet
        _mint(
            msg.sender,
            _createTypedId(_id, TOKEN_TYPE_CLASSIC_MASK),
            _classicSupply,
            _data
        );
        tokenSupplies[
            _createTypedId(_id, TOKEN_TYPE_CLASSIC_MASK)
        ] = _classicSupply;
        if (_rareSupply > 0) {
            _mint(
                msg.sender,
                _createTypedId(_id, TOKEN_TYPE_RARE_MASK),
                _rareSupply,
                _data
            );
            tokenSupplies[
                _createTypedId(_id, TOKEN_TYPE_RARE_MASK)
            ] = _rareSupply;
        }
        if (_epicSupply > 0) {
            _mint(
                msg.sender,
                _createTypedId(_id, TOKEN_TYPE_EPIC_MASK),
                _epicSupply,
                _data
            );
            tokenSupplies[
                _createTypedId(_id, TOKEN_TYPE_EPIC_MASK)
            ] = _epicSupply;
        }

        // Emit that our podcast is now published
        emit PodcastPublished(
            _id,
            _classicSupply,
            _rareSupply,
            _epicSupply,
            _name,
            _podcastOwnerAddress
        );
    }

    /**
     * Register a podcast listen
     */
    function registerPodcastListen(uint256 _podcastId, address _listenerAddress)
        public
    {}

    /**
     * @dev Save a podcast investor
     */
    function _afterTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override {
        // In the case we are sending the token to a given wallet
        for (uint256 i = 0; i < ids.length; ++i) {
            if (_isPodcastRelatedToken(ids[i])) {
                // If this token is a podcast related one (so classic, rare or epic)
                uint256 _podcastId = _extractPodcastId(ids[i]);
                // If we got a to address, at it to this podcast investor
                if (to != address(0)) {
                    podcastInvestors[_podcastId].push(to);
                }
                // If we got a from address, remove it from the investor
                if (from != address(0)) {
                    _removeInvestorOnce(_podcastId, from);
                }
            } else if (_isPodcastNft(ids[i])) {
                // If this token is a podcast NFT, change the owner of this podcast
                uint256 _podcastId = _extractPodcastId(ids[i]);
                owners[_podcastId] = to;
            }
            // TODO : Should also check if that a NFT, and then handle a nft owner change
        }
    }

    /**
     * @dev Pay a user listening
     */
    function payUserListenToWallet(
        address _listenerAddress,
        uint256 _listenCount,
        uint256 _podcastId
    ) public onlyOwner {
        require(
            _listenerAddress != address(0),
            "ERC1155: paying the zero address"
        );
        require(_listenCount > 0, "ERC1155: paying 0 listen");
        // The multiplier on listen count
        uint256 _listenMultiplier = 1;

        // Check if the listener has some token in the podcast (if yes, increase it's multiplier)
        uint256 _epicBalance = balanceOf(
            _listenerAddress,
            _createTypedId(_podcastId, TOKEN_TYPE_EPIC_MASK)
        );
        _listenMultiplier += _epicBalance * 1000;
        uint256 _rareBalance = balanceOf(
            _listenerAddress,
            _createTypedId(_podcastId, TOKEN_TYPE_RARE_MASK)
        );
        _listenMultiplier += _rareBalance * 100;
        uint256 _classicBalance = balanceOf(
            _listenerAddress,
            _createTypedId(_podcastId, TOKEN_TYPE_CLASSIC_MASK)
        );
        _listenMultiplier += _classicBalance * 10;

        // Compute the number of token to mint
        uint256 _toMint = _listenCount * _listenMultiplier;

        // Then, mint them directly into the listener wallet
        _mint(_listenerAddress, TOKEN_TYPE_UTILITY, _toMint, new bytes(0));
    }

    /**
     * @dev Create a typed token id
     */
    function _createTypedId(uint256 _id, uint256 _type)
        private
        pure
        returns (uint256 _typedId)
    {
        return (_id << ID_OFFSET) | _type;
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
     * @dev Return the id of a podcast without the token type mask
     * @param _id uint256 ID of the token tto exclude the mask of
     * @return uint256 The id without the type mask
     */
    function _extractPodcastId(uint256 _id) private pure returns (uint256) {
        return _id >> ID_OFFSET;
    }

    /**
     * @dev Return the token type
     * @param _id uint256 ID of the token to extract the mask from
     * @return uint256 The token type
     */
    function _extractTokenType(uint256 _id) private pure returns (uint256) {
        return _id & TYPE_MASK;
    }

    /**
     * @dev Check if the given token exist
     * @param _id uint256 ID of the token to check
     * @return bool true if the token is related to a podcast, false otherwise
     */
    function _isPodcastRelatedToken(uint256 _id) private view returns (bool) {
        return tokenSupplies[_id] > 0;
    }

    /**
     * @dev Check if the given token id is a podcast NFT
     * @param _id uint256 ID of the token to check
     * @return bool true if the token is a podcast nft, false otherwise
     */
    function _isPodcastNft(uint256 _id) private pure returns (bool) {
        return _extractTokenType(_id) == TOKEN_TYPE_NFT_MASK;
    }

    /**
     * @dev return an item from an array
     */
    function _removeInvestorOnce(uint256 _podcastId, address _investorAddress)
        private
    {
        // Get the list of address for the given podcast
        address[] storage _currentPodcastInvestors = podcastInvestors[
            _podcastId
        ];
        // Iterate over it to find all the time the investor is mentionned
        for (uint256 i = 0; i < _currentPodcastInvestors.length; ++i) {
            address _currentInvestorAddress = _currentPodcastInvestors[i];
            // If we found it, remove it from the array and exit (only remove it once)
            if (_currentInvestorAddress == _investorAddress) {
                _currentPodcastInvestors[i] = _currentPodcastInvestors[
                    _currentPodcastInvestors.length - 1
                ];
                _currentPodcastInvestors.pop();
                podcastInvestors[_podcastId] = _currentPodcastInvestors;
                return;
            }
        }
    }
}
