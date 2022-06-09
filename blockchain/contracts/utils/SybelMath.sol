// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Contract that provide some utils function for each sybel smart contract (decimals aware, podcast id and extraction mecanism)
 */
abstract contract SybelContract {
    // The decimals for each emitted token
    uint256 public constant DECIMALS = 10**6;

    // The offset of the id and the mask we use to store the token type
    uint256 public constant ID_OFFSET = 4;
    uint256 public constant TYPE_MASK = 0xF;

    /**
     * @dev Build the id for a S FNT
     */
    function buildSnftId(uint256 _podcastId, uint256 _type)
        public
        pure
        returns (uint256)
    {
        return (_podcastId << ID_OFFSET) | _type;
    }

    /**
     * @dev Return the id of a podcast without the token type mask
     * @param _id uint256 ID of the token tto exclude the mask of
     * @return uint256 The id without the type mask
     */
    function extractPodcastId(uint256 _id) public pure returns (uint256) {
        return _id >> ID_OFFSET;
    }

    /**
     * @dev Return the token type
     * @param _id uint256 ID of the token to extract the mask from
     * @return uint256 The token type
     */
    function extractTokenType(uint256 _id) public pure returns (uint256) {
        return _id & TYPE_MASK;
    }

    /**
     * @dev Return the token type
     * @param _id uint256 ID of the token to extract the mask from
     * @return uint256 The token type
     */
    function isPodcastNftToken(uint256 _id) public pure returns (uint256) {
        return _id & TYPE_MASK;
    }
}
