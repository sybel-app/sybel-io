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

    // Id of podcast to owner of podcast
    mapping(uint256 => address) public owners;

    // id of token to array of investor
    mapping(uint256 => address[]) public podcastInvestors;

    // Supply of each tokens (classic, rare and epic only) by they id
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

    // Event when podcast owner changed
    event PodcastOwnerChanged(uint256 podcastId, address from, address to);

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
        uint256 classicSupply,
        uint256 rareSupply,
        uint256 epicSupply,
        string memory name,
        bytes calldata data,
        address podcastOwnerAddress
    ) public onlyOwner {
        require(
            classicSupply > 0,
            "SYB: Cannot add podcast without classic supply !"
        );

        // Get the next podcast id and increment the current podcast token id
        uint256 id = _getNextTokenID();
        _incrementPodcastTokenID();
        // No need to update the owner here, since it will be called on the _afterTokenTransfer of the _mint method

        // Give the podcast owner 1000 utility token
        _mint(podcastOwnerAddress, TOKEN_TYPE_UTILITY, 1000, data);

        // Mint the podcast nft into the podcast owner wallet directly
        _mint(
            podcastOwnerAddress,
            _createTypedId(id, TOKEN_TYPE_NFT_MASK),
            1,
            data
        );

        // Mint all the fraction of this token into the owner wallet
        _mint(
            msg.sender,
            _createTypedId(id, TOKEN_TYPE_CLASSIC_MASK),
            classicSupply,
            data
        );
        tokenSupplies[
            _createTypedId(id, TOKEN_TYPE_CLASSIC_MASK)
        ] = classicSupply;
        if (rareSupply > 0) {
            _mint(
                msg.sender,
                _createTypedId(id, TOKEN_TYPE_RARE_MASK),
                rareSupply,
                data
            );
            tokenSupplies[
                _createTypedId(id, TOKEN_TYPE_RARE_MASK)
            ] = rareSupply;
        }
        if (epicSupply > 0) {
            _mint(
                msg.sender,
                _createTypedId(id, TOKEN_TYPE_EPIC_MASK),
                epicSupply,
                data
            );
            tokenSupplies[
                _createTypedId(id, TOKEN_TYPE_EPIC_MASK)
            ] = epicSupply;
        }

        // Emit that our podcast is now published
        emit PodcastPublished(
            id,
            classicSupply,
            rareSupply,
            epicSupply,
            name,
            podcastOwnerAddress
        );
    }

    /**
     * @dev Handle the transfer token (so update the podcast investor, change the owner of some podcast etc)
     */
    function _afterTokenTransfer(
        address,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory,
        bytes memory
    ) internal override {
        // In the case we are sending the token to a given wallet
        for (uint256 i = 0; i < ids.length; ++i) {
            if (_isPodcastRelatedToken(ids[i])) {
                // If this token is a podcast related one (so classic, rare or epic)
                uint256 podcastId = _extractPodcastId(ids[i]);
                // If we got a to address, at it to this podcast investor
                if (to != address(0)) {
                    _addInvestorOnce(podcastInvestors[podcastId], to);
                }
                // If we got a from address, remove it from the investor
                if (from != address(0)) {
                    _addInvestorOnce(podcastInvestors[podcastId], from);
                }
            } else if (_isPodcastNft(ids[i])) {
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
        address listenerAddress,
        uint256 listenCount,
        uint256 podcastId
    ) public onlyOwner {
        require(
            listenerAddress != address(0),
            "SYB: Want to pay the zero address"
        );
        require(listenCount > 0, "SYB: Want to pay 0 listen");
        // The multiplier on listen count
        uint256 listenMultiplier = 1;

        // Check if the listener has some token in the podcast
        uint256 epicBalance = balanceOf(
            listenerAddress,
            _createTypedId(podcastId, TOKEN_TYPE_EPIC_MASK)
        );
        uint256 rareBalance = balanceOf(
            listenerAddress,
            _createTypedId(podcastId, TOKEN_TYPE_RARE_MASK)
        );
        uint256 classicBalance = balanceOf(
            listenerAddress,
            _createTypedId(podcastId, TOKEN_TYPE_CLASSIC_MASK)
        );

        // Increase hte multiplier only for the rarest token found
        if (epicBalance > 0) {
            listenMultiplier += epicBalance * 100;
        } else if (rareBalance > 0) {
            listenMultiplier += rareBalance * 50;
        } else if (classicBalance > 0) {
            listenMultiplier += classicBalance * 10;
        }

        // Compute the number of token to mint
        uint256 toMint = listenCount * listenMultiplier;

        // Then, mint them directly into the listener wallet
        _mint(listenerAddress, TOKEN_TYPE_UTILITY, toMint, new bytes(0));
    }

    /**
     * @dev Pay a podcaster from it's podcast id's and the listen counts per podcast id
     * /!\ The _podcastIds and _listenCounts should be the same size, for one to one array mapping
     */
    function payPodcaster(
        uint256[] calldata podcastIds,
        uint256[] calldata listenCounts
    ) public onlyOwner {
        require(
            podcastIds.length == listenCounts.length,
            "SYB: Can't pay of podcast for id and listen of different length"
        );
        // Iterate over each podcast id received
        for (uint256 i = 0; i < podcastIds.length; ++i) {
            // Get the base amount to be paid dependening on the number of listen
            uint256 toMintForOwner = 1000 * listenCounts[i];
            // Find all the investor of this podcast
            uint256 podcastId = podcastIds[i];
            uint256 paidAmount = _payPodcastInvestor(podcastId, toMintForOwner);
            toMintForOwner -= paidAmount;
            // Pay the podcast owner if we got a valid wallet
            address ownerWallet = owners[podcastId];
            if (ownerWallet == address(0)) {
                // If we didn't find the owner wallet, send the minted amount to the sender of this message
                _mint(
                    msg.sender,
                    TOKEN_TYPE_UTILITY,
                    toMintForOwner,
                    new bytes(0)
                );
            } else {
                _mint(
                    ownerWallet,
                    TOKEN_TYPE_UTILITY,
                    toMintForOwner,
                    new bytes(0)
                );
            }
        }
    }

    /**
     * @dev Pay all the investor for a given podcast
     */
    function _payPodcastInvestor(uint256 podcastId, uint256 baseAmount)
        private
        onlyOwner
        returns (uint256 mintedForInvestor)
    {
        uint256 mintedToken = 0;

        uint256 epicAmount = (baseAmount * 30) / 100;
        uint256 rareAmount = (baseAmount * 20) / 100;
        uint256 classicAmount = (baseAmount * 10) / 100;

        for (uint256 i = 0; i < podcastInvestors[podcastId].length; ++i) {
            address investor = podcastInvestors[podcastId][i];
            // Get the ratio of each token he has
            uint256 epicRatio = _getWalletRatioForToken(
                podcastId,
                TOKEN_TYPE_EPIC_MASK,
                investor
            );
            uint256 rareRatio = _getWalletRatioForToken(
                podcastId,
                TOKEN_TYPE_RARE_MASK,
                investor
            );
            uint256 classicRatio = _getWalletRatioForToken(
                podcastId,
                TOKEN_TYPE_CLASSIC_MASK,
                investor
            );

            // Compute the amount to mint
            uint256 toMintAmount = (epicAmount * epicRatio) / 100; // epic
            toMintAmount += (rareAmount * rareRatio) / 100; // rare
            toMintAmount += (classicAmount * classicRatio) / 100; // classic

            // Mint the computed amount directly to the investor wallet
            _mint(investor, TOKEN_TYPE_UTILITY, toMintAmount, new bytes(0));

            // Append the minted amount to the total
            mintedToken += toMintAmount;
        }
        return mintedToken;
    }

    /**
     * @dev Get the wallet balance percentage ratio for the given podcast and mask (between 0 and 100)
     */
    function _getWalletRatioForToken(
        uint256 podcastId,
        uint256 mask,
        address wallet
    ) private view returns (uint256 ratio) {
        uint256 tokenId = _createTypedId(podcastId, mask);
        // Ensure we got supply for this token
        if (tokenSupplies[tokenId] > 0) {
            uint256 tokenBalance = balanceOf(wallet, tokenId);
            // Compute our ratio
            ratio = (tokenBalance * 100) / tokenSupplies[tokenId];
        }
        return ratio;
    }

    /**
     * @dev Create a typed token id
     */
    function _createTypedId(uint256 _id, uint256 _type)
        private
        pure
        returns (uint256 typedId)
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
     * @dev Remove an investor from the investor array
     */
    function _removeInvestorOnce(
        address[] storage investors,
        address investorAddress
    ) private {
        // Iterate over it to find all the time the investor is mentionned
        for (uint256 i = 0; i < investors.length; ++i) {
            // If we found it, remove it from the array and exit (only remove it once)
            if (investors[i] == investorAddress) {
                investors[i] = investors[investors.length - 1];
                investors.pop();
                return;
            }
        }
    }

    /**
     * @dev Add an investor to the investor array (if he isn't present yet)
     */
    function _addInvestorOnce(
        address[] storage investors,
        address investorAddress
    ) private {
        // Check if the investor is already present in the investor array
        bool isAlreadyAnInvestor = false;
        // Iterate over it to find all the time the investor is mentionned
        for (uint256 i = 0; i < investors.length; ++i) {
            // Update our already investor address
            isAlreadyAnInvestor =
                isAlreadyAnInvestor ||
                investors[i] == investorAddress;
        }
        if (!isAlreadyAnInvestor) {
            // If the user wasn't already an investor of this podcast, add it to the array
            investors.push(investorAddress);
        }
    }
}
