// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./IMinter.sol";
import "../badges/access/PaymentBadgesAccessor.sol";
import "../badges/cost/IFractionCostBadges.sol";
import "../utils/SybelMath.sol";
import "../tokens/SybelInternalTokens.sol";
import "../tokens/SybelToken.sol";
import "../utils/MintingAccessControlUpgradeable.sol";

/**
 * @dev Represent our minter contract
 */
/// @custom:security-contact crypto-support@sybel.co
contract Minter is
    IMinter,
    MintingAccessControlUpgradeable,
    PaymentBadgesAccessor
{
    /**
     * @dev Access our internal tokens
     */
    SybelInternalTokens private sybelInternalTokens;

    /**
     * @dev Access our governance token
     */
    SybelToken private sybelToken;

    /**
     * @dev Access our fraction cost badges
     */
    IFractionCostBadges public fractionCostBadges;

    /**
     * @dev Address of the foundation wallet
     */
    address public foundationWallet;

    /**
     * @dev Event emitted when a new podcast is minted
     */
    event PodcastMinted(uint256 baseId, address owner);

    /**
     * @dev Event emitted when a new fraction of podcast is minted
     */
    event FractionMinted(
        uint256 fractionId,
        address user,
        uint256 amount,
        uint256 cost
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address sybelTokenAddr,
        address internalTokenAddr,
        address listenerBadgesAddr,
        address podcastBadgesAddr,
        address fractionCostBadgesAddr,
        address foundationAddr
    ) external initializer {
        /*
        // Only for v1 deployment
        __MintingAccessControlUpgradeable_init();
        __PaymentBadgesAccessor_init(listenerBadgesAddr, podcastBadgesAddr);

        sybelInternalTokens = SybelInternalTokens(internalTokenAddr);
        sybelToken = SybelToken(sybelTokenAddr);
        fractionCostBadges = IFractionCostBadges(fractionCostBadgesAddr);

        foundationWallet = foundationAddr;*/
    }

    function migrateToV2(address sybelTokenAddr, address foundationAddr)
        external
        reinitializer(2)
    {
        // Only for v2 upgrade
        sybelToken = SybelToken(sybelTokenAddr);
        foundationWallet = foundationAddr;
    }

    /**
     * @dev Add a new podcast to our eco system
     */
    function addPodcast(address podcastOwnerAddress)
        external
        override
        onlyRole(SybelRoles.MINTER)
        whenNotPaused
        returns (uint256)
    {
        require(
            podcastOwnerAddress != address(0),
            "SYB: Cannot add podcast for the 0 address !"
        );
        // Try to mint the new podcast
        uint256 podcastId = sybelInternalTokens.mintNewPodcast(
            podcastOwnerAddress
        );
        // Then set the supply for each token types
        uint256[] memory ids = new uint256[](4);
        ids[0] = SybelMath.buildClassicNftId(podcastId);
        ids[1] = SybelMath.buildRareNftId(podcastId);
        ids[2] = SybelMath.buildEpicNftId(podcastId);
        ids[3] = SybelMath.buildLegendaryNftId(podcastId);
        uint256[] memory supplies = new uint256[](4);
        supplies[0] = 200; // Common
        supplies[1] = 20; // Rare
        supplies[2] = 5; // Epic
        supplies[3] = 1; // Legendary
        sybelInternalTokens.setSupplyBatch(ids, supplies);
        // Emit the event
        emit PodcastMinted(podcastId, podcastOwnerAddress);
        // Return the minted podcast id
        return podcastId;
    }

    /**
     * @dev Mint a new s nft
     */
    function mintFraction(
        uint256 id,
        address to,
        uint256 amount
    ) external override onlyRole(SybelRoles.MINTER) whenNotPaused {
        // Get the cost of the fraction
        uint128 fractionCost = fractionCostBadges.getBadge(id);
        uint256 totalCost = fractionCost * amount;
        // Check if the user have enough the balance
        uint256 userBalance = sybelToken.balanceOf(to);
        require(
            userBalance >= totalCost,
            "SYB: Not enough balance to pay for this fraction"
        );
        // Mint his Fraction of NFT
        sybelInternalTokens.mint(to, id, amount);
        uint256 amountForFundation = (totalCost * 2) / 10;
        // Send 20% of sybl token to the foundation
        sybelToken.mint(foundationWallet, amountForFundation);
        // Send 80% to the owner
        address owner = sybelInternalTokens.ownerOf(
            SybelMath.extractPodcastId(id)
        );
        uint256 amountForOwner = totalCost - amountForFundation;
        sybelToken.transfer(to, owner, amountForOwner);

        // Emit the event
        emit FractionMinted(id, to, amount, totalCost);
    }

    /**
     * @dev Increase the supply for a podcast
     */
    function increaseSupply(uint256 id, uint256 newSupply)
        external
        onlyRole(SybelRoles.MINTER)
        whenNotPaused
    {
        // Get the cost of the new supply
        uint96 tokenSupplycost = supplyCost(SybelMath.extractTokenType(id));
        uint256 totalCost = tokenSupplycost * newSupply;
        // Find the owner of this podcast
        address owner = sybelInternalTokens.ownerOf(
            SybelMath.extractPodcastId(id)
        );
        // Check if the owner have enough the balance
        uint256 userBalance = sybelToken.balanceOf(owner);
        require(
            userBalance >= totalCost,
            "SYB: The owner havn't enough balance to supply the new fraction"
        );
        // Compute the supply difference
        uint256 newRealSupply = sybelInternalTokens.supplyOf(id) + newSupply;
        // Mint his Fraction of NFT
        sybelInternalTokens.setSupplyBatch(
            SybelMath.asSingletonArray(id),
            SybelMath.asSingletonArray(newRealSupply)
        );
        // Transfer his sybl token to the foundation wallet
        sybelToken.transfer(owner, foundationWallet, totalCost);
    }

    /**
     * @dev The initial cost of a fraction type
     * We use a pure function instead of a mapping to economise on storage read, and since this reawrd shouldn't evolve really fast
     */
    function supplyCost(uint8 tokenType) public pure returns (uint96) {
        uint96 foundedSupplyCost = 0;
        if (tokenType == SybelMath.TOKEN_TYPE_CLASSIC_MASK) {
            foundedSupplyCost = 0.5 ether; // 0.5 SYBL
        } else if (tokenType == SybelMath.TOKEN_TYPE_RARE_MASK) {
            foundedSupplyCost = 2 ether; // 2 SYBL
        } else if (tokenType == SybelMath.TOKEN_TYPE_EPIC_MASK) {
            foundedSupplyCost = 5 ether; // 5 SYBL
        } else if (tokenType == SybelMath.TOKEN_TYPE_LEGENDARY_MASK) {
            foundedSupplyCost = 10 ether; // 10 SYBL
        }
        return foundedSupplyCost;
    }
}
