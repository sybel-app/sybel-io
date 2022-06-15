// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../badges/accessor/IBadgeAccessor.sol";
import "../utils/pausable/IPausable.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";

/**
 * @dev Represent our minter contract
 */
interface IMinter is IPausable, IBadgeAccessor {
    /**
     * @dev Add a new podcast to our eco system
     */
    function addPodcast(
        uint256 _classicSupply,
        uint256 _rareSupply,
        uint256 _epicSupply,
        bytes calldata _data,
        address _podcastOwnerAddress
    ) external;

    // TODO : Function to mint some new podcast fraction nft
}
