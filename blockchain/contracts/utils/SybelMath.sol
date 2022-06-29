// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

library SybelMath {
    // The offset of the id and the mask we use to store the token type
    uint8 public constant ID_OFFSET = 4;
    uint8 public constant TYPE_MASK = 0xF;

    // The mask for the different podcast specfic types
    uint8 public constant TOKEN_TYPE_NFT_MASK = 1;
    uint8 public constant TOKEN_TYPE_STANDART_MASK = 2;
    uint8 public constant TOKEN_TYPE_CLASSIC_MASK = 3;
    uint8 public constant TOKEN_TYPE_RARE_MASK = 4;
    uint8 public constant TOKEN_TYPE_EPIC_MASK = 5;
    uint8 public constant TOKEN_TYPE_LEGENDARY_MASK = 6;

    // The decimals for each emitted token
    uint8 public constant DECIMALS_COUNT = 6;
    uint64 public constant DECIMALS = 1000000;

    /**
     * @dev Build the id for a S FNT
     */
    function buildSnftId(uint256 _podcastId, uint8 _type)
        internal
        pure
        returns (uint256)
    {
        return (_podcastId << ID_OFFSET) | _type;
    }

    /**
     * @dev Build the id for a NFT
     */
    function buildNftId(uint256 _podcastId) internal pure returns (uint256) {
        return (_podcastId << ID_OFFSET) | TOKEN_TYPE_NFT_MASK;
    }

    /**
     * @dev Build the id for a classic NFT id
     */
    function buildStandartNftId(uint256 _podcastId)
        internal
        pure
        returns (uint256)
    {
        return (_podcastId << ID_OFFSET) | TOKEN_TYPE_STANDART_MASK;
    }

    /**
     * @dev Build the id for a classic NFT id
     */
    function buildClassicNftId(uint256 _podcastId)
        internal
        pure
        returns (uint256)
    {
        return (_podcastId << ID_OFFSET) | TOKEN_TYPE_CLASSIC_MASK;
    }

    /**
     * @dev Build the id for a rare NFT id
     */
    function buildRareNftId(uint256 _podcastId)
        internal
        pure
        returns (uint256)
    {
        return (_podcastId << ID_OFFSET) | TOKEN_TYPE_RARE_MASK;
    }

    /**
     * @dev Build the id for a epic NFT id
     */
    function buildEpicNftId(uint256 _podcastId)
        internal
        pure
        returns (uint256)
    {
        return (_podcastId << ID_OFFSET) | TOKEN_TYPE_EPIC_MASK;
    }

    /**
     * @dev Build the id for a epic NFT id
     */
    function buildLegendaryNftId(uint256 _podcastId)
        internal
        pure
        returns (uint256)
    {
        return (_podcastId << ID_OFFSET) | TOKEN_TYPE_LEGENDARY_MASK;
    }

    /**
     * @dev Return the id of a podcast without the token type mask
     * @param _id uint256 ID of the token tto exclude the mask of
     * @return uint256 The id without the type mask
     */
    function extractPodcastId(uint256 _id) internal pure returns (uint256) {
        return _id >> ID_OFFSET;
    }

    /**
     * @dev Return the token type
     * @param _id uint256 ID of the token to extract the mask from
     * @return uint256 The token type
     */
    function extractTokenType(uint256 _id) internal pure returns (uint8) {
        return uint8(_id & TYPE_MASK);
    }

    /**
     * @dev Check if the given token exist
     * @param _id uint256 ID of the token to check
     * @return bool true if the token is related to a podcast, false otherwise
     */
    function isPodcastRelatedToken(uint256 _id) internal pure returns (bool) {
        uint8 tokenType = extractTokenType(_id);
        return
            tokenType > TOKEN_TYPE_NFT_MASK &&
            tokenType <= TOKEN_TYPE_LEGENDARY_MASK;
    }

    /**
     * @dev Check if the given token id is a podcast NFT
     * @param _id uint256 ID of the token to check
     * @return bool true if the token is a podcast nft, false otherwise
     */
    function isPodcastNft(uint256 _id) internal pure returns (bool) {
        return extractTokenType(_id) == TOKEN_TYPE_NFT_MASK;
    }
}
