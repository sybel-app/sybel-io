// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../utils/pausable/IPausable.sol";
import "../badges/accessor/IBadgeAccessor.sol";

/**
 * @dev Represent our token provider class (like small banking system, with batch minting and burning operation)
 */
interface ITokenProvider is IPausable, IBadgeAccessor {

    /**
     * @dev Mint a new podcast, return the id of the built podcast
     */
    function mintPodcast(
        uint256 _classicSupply,
        uint256 _rareSupply,
        uint256 _epicSupply,
        bytes calldata _data,
        address _podcastOwnerAddress
    ) external returns(uint256);
    
}