// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./2_SybBadgeCalculator.sol";

contract SybelFNFT is ERC1155, Ownable {

    // Our base token types
    uint public constant TOKEN_TYPE_UTILITY = 0; // Fungible
    uint public constant TOKEN_TYPE_GOVERNANCE = 1; // Fungible

    // The mask for the different podcast specfic types
    uint public constant TOKEN_TYPE_NFT_MASK = 1; 
    uint public constant TOKEN_TYPE_EPIC_MASK = 2;
    uint public constant TOKEN_TYPE_RARE_MASK = 3;
    uint public constant TOKEN_TYPE_CLASSIC_MASK = 4;

    // The cap for each mintable token type
    uint public constant TOKEN_EPIC_CAP = 50;
    uint public constant TOKEN_RARE_CAP = 200;
    uint public constant TOKEN_CLASSIC_CAP = 1000;

    // The offset of the id and the mask we use to store the token type
    uint public constant ID_OFFSET = 4;
    uint public constant TYPE_MASK = 0xF;

    // The decimals for each emitted token
    uint public constant DECIMALS = 10**6;

    // Our base reward amount for podcast listen and owner
    uint256 private constant USER_LISTEN_REWARD = 10**3; // So 0.001 TSE
    uint256 private constant OWNER_LISTEN_REWARD = DECIMALS / 10; // So 0.1 TSE
    uint256 private constant OWNER_PUBLISH_REWARD = DECIMALS; // So 1 TSE

    // Our coefficient to compute the podcast and user badge
    uint private constant SYBEL_COEFFICIENT = 250;

    // The current podcast token id
    uint256 private _currentPodcastTokenID = 1;

    // Id of podcast to owner of podcast
    mapping (uint256 => address) public owners;

    // id of token to array of investor
    mapping (uint256 => address[]) public podcastInvestors;

    // Amount of nft a listener has
    mapping (address => uint256) public listenerNfts;

    // Supply of each tokens (classic, rare and epic only) by they id
    mapping (uint256 => uint256) public tokenSupplies;

    // Event when podcast is published
    event PodcastPublished(uint baseId, uint classicAmount, uint rareAmount, uint epicAmount, string name, address owner);

    // Event when podcast owner changed
    event PodcastOwnerChanged(uint podcastId, address from, address to);

    constructor() ERC1155("https://sybel-io-fnft.s3.eu-west-1.amazonaws.com/{id}.json") {
        // Mint all of our TOKEN_TYPE_GOVERNANCE token (3 billion)
        _mint(msg.sender, TOKEN_TYPE_GOVERNANCE, 3000000000 * DECIMALS, "");
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
        require(_classicSupply > 0, "SYB: Cannot add podcast without classic supply !");
        require(_classicSupply <= TOKEN_CLASSIC_CAP, "SYB: Cannot add podcast with that much classic supply !");
        require(_rareSupply <= TOKEN_RARE_CAP, "SYB: Cannot add podcast with that much rare supply !");
        require(_epicSupply <= TOKEN_EPIC_CAP, "SYB: Cannot add podcast with that much epic supply !");

        // Get the next podcast id and increment the current podcast token id
        uint256 id = _getNextTokenID();
        _incrementPodcastTokenID();
        // No need to update the owner here, since it will be called on the _afterTokenTransfer of the _mint method

        // Give the podcast owner 1000 utility token
        _mint(_podcastOwnerAddress, TOKEN_TYPE_UTILITY, OWNER_PUBLISH_REWARD, _data);

        // Mint the podcast nft into the podcast owner wallet directly
        _mint(_podcastOwnerAddress, _createTypedId(id, TOKEN_TYPE_NFT_MASK), 1, _data);

        // Mint all the fraction of this token into the owner wallet
        _mint(msg.sender, _createTypedId(id, TOKEN_TYPE_CLASSIC_MASK), _classicSupply, _data);
        if(_rareSupply > 0) {
            _mint(msg.sender, _createTypedId(id, TOKEN_TYPE_RARE_MASK), _rareSupply, _data);
        }
        if(_epicSupply > 0) {
            _mint(msg.sender, _createTypedId(id, TOKEN_TYPE_EPIC_MASK), _epicSupply, _data);
        }

        // Emit that our podcast is now published
        emit PodcastPublished(id, _classicSupply, _rareSupply, _epicSupply, _name, _podcastOwnerAddress);
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
            if(_isPodcastRelatedToken(ids[i])) {
                // If this token is a podcast related one (so classic, rare or epic)
                uint256 podcastId = _extractPodcastId(ids[i]);
                // If we got a to address (so not a burn token)
                if(to != address(0)) {
                    // Add this listener as an investor of this podcast
                    _addInvestorOnce(podcastInvestors[podcastId], to);
                    // Update the number of token held by this listener
                    listenerNfts[from] += amounts[i];
                }
                // If we got a from address,so not a minted token
                if(from != address(0)) {
                    // Remove the from address from the wallet investor
                    _removeInvestorOnce(podcastInvestors[podcastId], from);
                    // Update the number of token held by this listener
                    listenerNfts[from] -= amounts[i];
                } else {
                    // Update token supplies (cause if the from is address 0, it's mean we have mint this token)
                    // Only perform the update for podcast related token, since we don't need to know the supply of all the other token
                    tokenSupplies[ids[i]] +=  amounts[i];
                }
            } else if(_isPodcastNft(ids[i])) {
                // If this token is a podcast NFT, change the owner of this podcast
                uint256 podcastId = _extractPodcastId(ids[i]);
                owners[podcastId] = to;
                emit PodcastOwnerChanged(podcastId, from, to);
            }
        }
    }

    /**
     * @dev Pay a user listening
     */
    function payUserListen(
        address _listenerAddress,
        uint256 _listenCount,
        uint256 _podcastId
    ) public onlyOwner {
        require(_listenerAddress != address(0), "SYB: Want to pay the zero address");
        require(_listenCount > 0, "SYB: Want to pay 0 listen");
        // The multiplier on listen count
        uint listenMultiplier = 1;

        // Check if the listener has some token in the podcast
        uint epicBalance = balanceOf(_listenerAddress, _createTypedId(_podcastId, TOKEN_TYPE_EPIC_MASK));
        uint rareBalance = balanceOf(_listenerAddress, _createTypedId(_podcastId, TOKEN_TYPE_RARE_MASK));
        uint classicBalance = balanceOf(_listenerAddress, _createTypedId(_podcastId, TOKEN_TYPE_CLASSIC_MASK));

        // Increase hte multiplier only for the rarest token found
        if(epicBalance > 0) {
            listenMultiplier += epicBalance * 10;
        } else if(rareBalance > 0) {
            listenMultiplier += rareBalance * 5;
        } else if(classicBalance > 0) {
            listenMultiplier += classicBalance * 2;
        }

        // Compute the number of token to mint
        uint toMint = _listenCount * listenMultiplier * USER_LISTEN_REWARD;

        // Then, mint them directly into the listener wallet
        _mint(_listenerAddress, TOKEN_TYPE_UTILITY, toMint, new bytes(0));
    }

    /**
     * @dev Pay a podcaster from it's podcast id's and the listen counts per podcast id
     * /!\ The _podcastIds and _listenCounts should be the same size, for one to one array mapping
     */
    function payPodcaster(
        uint256[] calldata _podcastIds,
        uint[] calldata _listenCounts
    ) public onlyOwner {
        require(_podcastIds.length == _podcastIds.length, "SYB: Can't pay of podcast for id and listen of different length");
        require(_podcastIds.length < 10, "SYB: Can't pay more than 10 podcast at a time"); // Small requirement to prevent excessive gas
        // Iterate over each podcast id received
        for (uint i = 0; i < _podcastIds.length; ++i) {
            // Get the base amount to be paid dependening on the number of listen
            uint toMintForOwner = OWNER_LISTEN_REWARD * _listenCounts[i];
            // Find all the investor of this podcast
            uint podcastId = _podcastIds[i];
            uint paidAmount = _payPodcastInvestor(podcastId, toMintForOwner);
            toMintForOwner -= paidAmount;
            // Pay the podcast owner if we got a valid wallet
            address ownerWallet = owners[podcastId];
            if(ownerWallet == address(0)) {
                // If we didn't find the owner wallet, send the minted amount to the sender of this message
                _mint(msg.sender, TOKEN_TYPE_UTILITY, toMintForOwner, new bytes(0));
            } else {
                _mint(ownerWallet, TOKEN_TYPE_UTILITY, toMintForOwner, new bytes(0));
            }
        }
    }

    /**
     * @dev Pay all the investor for a given podcast
     */
    function _payPodcastInvestor(
        uint _podcastId,
        uint _baseAmount
    ) private onlyOwner returns(uint mintedForInvestor) {
        uint mintedToken = 0;

        uint epicAmount = _baseAmount * 30 / 100;
        uint rareAmount = _baseAmount * 20 / 100;
        uint classicAmount = _baseAmount * 10 / 100;

        for (uint i = 0; i < podcastInvestors[_podcastId].length; ++i) {
            address investor = podcastInvestors[_podcastId][i];
            // Get the ratio of each token he has
            uint epicRatio = _getWalletRatioForToken(_podcastId, TOKEN_TYPE_EPIC_MASK, investor);
            uint rareRatio = _getWalletRatioForToken(_podcastId, TOKEN_TYPE_RARE_MASK, investor);
            uint classicRatio = _getWalletRatioForToken(_podcastId, TOKEN_TYPE_CLASSIC_MASK, investor);

            // Compute the amount to mint
            uint toMintAmount = epicAmount * epicRatio / DECIMALS; // epic
            toMintAmount += rareAmount * rareRatio / DECIMALS; // rare
            toMintAmount += classicAmount * classicRatio / DECIMALS; // classic

            // Mint the computed amount directly to the investor wallet
            _mint(investor, TOKEN_TYPE_UTILITY, toMintAmount, new bytes(0));

            // Append the minted amount to the total
            mintedToken += toMintAmount;
        }
        return mintedToken;
    }

    /**
     * @dev Get the wallet balance percentage ratio for the given podcast and mask (between 0 and $DECIMALS)
     */
    function _getWalletRatioForToken(
        uint _podcastId,
        uint _mask,
        address _wallet
    ) private view returns(uint ratio) {
        uint tokenId = _createTypedId(_podcastId, _mask);
        // Ensure we got supply for this token
        if(tokenSupplies[tokenId] > 0) {
            uint tokenBalance = balanceOf(_wallet, tokenId);
            // Compute our ratio
            ratio = (tokenBalance * DECIMALS) / tokenSupplies[tokenId];
        }
        return ratio;
    }

    /**
     * @dev Create a typed token id
     */ 
    function _createTypedId(
        uint256 _id,
        uint256 _type
    ) private pure returns(uint256 typedId) {
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
    function _incrementPodcastTokenID() private  {
        _currentPodcastTokenID++;
    }

    /**
     * @dev Return the id of a podcast without the token type mask
     * @param _id uint256 ID of the token tto exclude the mask of
     * @return uint256 The id without the type mask
     */
    function _extractPodcastId(uint256 _id) private pure returns(uint256) {
        return _id >> ID_OFFSET;
    }

    /**
     * @dev Return the token type
     * @param _id uint256 ID of the token to extract the mask from
     * @return uint256 The token type
     */
    function _extractTokenType(uint256 _id) private pure returns(uint256) {
        return _id & TYPE_MASK;
    }

    /**
     * @dev Check if the given token exist
     * @param _id uint256 ID of the token to check
     * @return bool true if the token is related to a podcast, false otherwise
     */
    function _isPodcastRelatedToken(uint256 _id) private view returns(bool) {
        return tokenSupplies[_id] > 0;
    }

    /**
     * @dev Check if the given token id is a podcast NFT
     * @param _id uint256 ID of the token to check
     * @return bool true if the token is a podcast nft, false otherwise
     */
    function _isPodcastNft(uint256 _id) private pure returns(bool) {
        return _extractTokenType(_id) == TOKEN_TYPE_NFT_MASK;
    }

    /**
     * @dev Remove an investor from the investor array
     */
    function _removeInvestorOnce(
        address[] storage _investors,
        address _investorAddress
    ) private {
        // Iterate over it to find all the time the investor is mentionned
        for (uint i = 0; i < _investors.length; ++i) {
            // If we found it, remove it from the array and exit (only remove it once)
            if(_investors[i] == _investorAddress) {
                _investors[i] = _investors[_investors.length - 1];
                _investors.pop();
                return ;
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
        for (uint i = 0; i < _investors.length; ++i) {
            // Update our already investor address
            isAlreadyAnInvestor = isAlreadyAnInvestor || _investors[i] == _investorAddress;
        }
        if(!isAlreadyAnInvestor) {
            // If the user wasn't already an investor of this podcast, add it to the array
            _investors.push(_investorAddress);
        }
    }

    event ComputationTest(uint id, uint result);

    function testComputation() public {
        uint testUserBadge1 = SybelBadgeCalculator.computeUserBadge(DECIMALS, SYBEL_COEFFICIENT, 0);
        emit ComputationTest(1, testUserBadge1);

        uint testUserBadge2 = SybelBadgeCalculator.computeUserBadge(DECIMALS, SYBEL_COEFFICIENT, 1);
        emit ComputationTest(2, testUserBadge2);

        //uint testUserBadge3 = SybelBadgeCalculator.computeUserBadge(DECIMALS, SYBEL_COEFFICIENT, 50);
        //emit ComputationTest(3, testUserBadge3);
    }
}