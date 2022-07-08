// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./IMinter.sol";
import "../badges/access/PaymentBadgesAccessor.sol";
import "../badges/cost/IFractionCostBadges.sol";
import "../utils/SybelMath.sol";
import "../tokens/SybelInternalTokens.sol";
import "../tokens/TokenSybelEcosystem.sol";
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
    TokenSybelEcosystem private tokenSybelEcosystem;

    /**
     * @dev Access our fraction cost badges
     */
    IFractionCostBadges public fractionCostBadges;

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
        address tseAddr,
        address internalTokenAddr,
        address listenerBadgesAddr,
        address podcastBadgesAddr,
        address fractionCostBadgesAddr
    ) public initializer {
        __MintingAccessControlUpgradeable_init();
        __PaymentBadgesAccessor_init(listenerBadgesAddr, podcastBadgesAddr);

        sybelInternalTokens = SybelInternalTokens(internalTokenAddr);
        tokenSybelEcosystem = TokenSybelEcosystem(tseAddr);
        fractionCostBadges = IFractionCostBadges(fractionCostBadgesAddr);
    }

    /**
     * @dev Add a new podcast to our eco system
     */
    function addPodcast(address _podcastOwnerAddress)
        external
        override
        onlyRole(SybelRoles.MINTER)
        whenNotPaused
        returns (uint256)
    {
        require(
            _podcastOwnerAddress != address(0),
            "SYB: Cannot add podcast for the 0 address !"
        );
        // Try to mint the new podcast
        uint256 podcastId = sybelInternalTokens.mintNewPodcast(
            _podcastOwnerAddress
        );
        // Then set the supply for each token types
        uint256[] memory ids = new uint256[](4);
        ids[0] = SybelMath.buildClassicNftId(podcastId);
        ids[1] = SybelMath.buildRareNftId(podcastId);
        ids[2] = SybelMath.buildEpicNftId(podcastId);
        ids[3] = SybelMath.buildLegendaryNftId(podcastId);
        uint256[] memory supplies = new uint256[](4);
        supplies[0] = 200; // Classic
        supplies[1] = 20; // Rare
        supplies[2] = 5; // Epic
        supplies[3] = 1; // Legendary
        sybelInternalTokens.setSupplyBatch(ids, supplies);
        // Emit the event
        emit PodcastMinted(podcastId, _podcastOwnerAddress);
        // Return the minted podcast id
        return podcastId;
    }

    /**
     * @dev Mint a new s nft
     */
    function mintFraction(
        uint256 _id,
        address _to,
        uint256 _amount
    ) external override onlyRole(SybelRoles.MINTER) whenNotPaused {
        // Get the cost of the fraction
        uint64 fractionCost = fractionCostBadges.getBadge(_id);
        uint256 totalCost = fractionCost * _amount;
        // Check if the user have enough the balance
        uint256 tseBalance = tokenSybelEcosystem.balanceOf(_to);
        require(
            tseBalance >= totalCost,
            "SYB: Not enough balance to pay for this fraction"
        );
        // Mint his Fraction of NFT
        sybelInternalTokens.mint(_to, _id, _amount);
        uint256 amountToBurn = (totalCost * 80) / 100;
        // Burn 80% of the cost TSE token
        tokenSybelEcosystem.burn(_to, amountToBurn);
        // Send 20% to the owner
        address owner = sybelInternalTokens.ownerOf(
            SybelMath.extractPodcastId(_id)
        );
        uint256 amountForOwner = totalCost - amountToBurn;
        tokenSybelEcosystem.transfer(_to, owner, amountForOwner);

        // Emit the event
        emit FractionMinted(_id, _to, _amount, totalCost);
    }

    /**
     * @dev Increase the supply for a podcast
     */
    function increaseSupply(uint256 _id, uint256 _newSupply)
        external
        onlyRole(SybelRoles.MINTER)
        whenNotPaused
    {
        // Get the cost of the new supply
        uint32 tokenSupplycost = supplyCost(SybelMath.extractTokenType(_id));
        uint256 totalCost = tokenSupplycost * _newSupply;
        // Find the owner of this podcast
        address owner = sybelInternalTokens.ownerOf(
            SybelMath.extractPodcastId(_id)
        );
        // Check if the owner have enough the balance
        uint256 tseBalance = tokenSybelEcosystem.balanceOf(owner);
        require(
            tseBalance >= totalCost,
            "SYB: The owner havn't enough balance to supply the new fraction"
        );
        // Compute the supply difference
        uint256 newRealSupply = sybelInternalTokens.supplyOf(_id) + _newSupply;
        // Mint his Fraction of NFT
        sybelInternalTokens.setSupplyBatch(
            SybelMath.asSingletonArray(_id),
            SybelMath.asSingletonArray(newRealSupply)
        );
        // Burn his TSE token
        tokenSybelEcosystem.burn(owner, totalCost);
    }

    /**
     * @dev The initial cost of a fraction type
     * We use a pure function instead of a mapping to economise on storage read, and since this reawrd shouldn't evolve really fast
     */
    function supplyCost(uint8 _tokenType) public pure returns (uint32) {
        uint32 foundedSupplyCost;
        if (_tokenType == SybelMath.TOKEN_TYPE_CLASSIC_MASK) {
            foundedSupplyCost = 500000; // 0.5 TSE
        } else if (_tokenType == SybelMath.TOKEN_TYPE_RARE_MASK) {
            foundedSupplyCost = 2000000; // 2 TSE
        } else if (_tokenType == SybelMath.TOKEN_TYPE_EPIC_MASK) {
            foundedSupplyCost = 5000000; // 5 TSE
        } else if (_tokenType == SybelMath.TOKEN_TYPE_LEGENDARY_MASK) {
            foundedSupplyCost = 10000000; // 10 TSE
        }
        return foundedSupplyCost;
    }
}
