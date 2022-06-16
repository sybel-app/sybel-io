// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../badges/access/IPaymentBadgeAccessor.sol";
import "../utils/pausable/IPausable.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";

/**
 * @dev Represent our minter contract
 */
interface IMinter is IPausable, IPaymentBadgeAccessor {
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

    /**
     * @dev Mint a new s nft
     */
    function mintSNFT(
        uint256 _id,
        address _to,
        uint256 _amount,
        bytes calldata _data
    ) external;
}
