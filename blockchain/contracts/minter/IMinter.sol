// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../utils/IPausable.sol";

/**
 * @dev Represent our minter contract
 */
interface IMinter is IPausable {
    /**
     * @dev Add a new podcast to our eco system
     */
    function addPodcast(address _podcastOwnerAddress)
        external
        returns (uint256);

    /**
     * @dev Mint a new fraction of nft
     */
    function mintFraction(
        uint256 _id,
        address _to,
        uint256 _amount
    ) external;

    /**
     * @dev Increase the supply for a podcast
     */
    function increaseSupply(uint256 _id, uint256 _newSupply) external;
}
