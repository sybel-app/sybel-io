// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "../utils/IPausable.sol";

/**
 * @dev Represent our minter contract
 */
interface IMinter is IPausable {
    /**
     * @dev Add a new podcast to our eco system
     */
    function addPodcast(
        uint256 _classicSupply,
        uint256 _rareSupply,
        uint256 _epicSupply,
        uint256 _legendarySupply,
        address _podcastOwnerAddress
    ) external;

    /**
     * @dev Mint a new s nft
     */
    function mintSNFT(
        uint256 _id,
        address _to,
        uint256 _amount
    ) external;
}
