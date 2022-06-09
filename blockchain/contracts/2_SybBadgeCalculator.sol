// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

library SybBadgeCalculator {
    event CalculationStep(uint256 baseCalcul, uint256 exponent);

    /**
     * @dev compute the user badge, with the provided decimals
     */
    function computeUserBadge(
        uint256 _decimals,
        uint256 _systemParameter,
        uint256 _numberOfNft
    ) public pure returns (uint256 userBadge) {
        // Formula = (x+1)^(1+(x/systemParam))
        // x = number of nft
        if (_numberOfNft > 0) {
            uint256 baseCalcul = (_numberOfNft + 1);
            uint256 exponentCalcul = _decimals +
                ((_numberOfNft * _decimals) / (_systemParameter * _decimals));
            // Rapidly overflow if too much precision on the computation
            // Should check with matt
            return baseCalcul;
        } else {
            return _decimals;
        }
    }

    /**
     * @dev compute the owner badge
     */
    function computePodcastBadge(
        uint256 _decimals,
        uint256 _systemParameter,
        uint256 _numberOfNftDropped,
        uint256 _ownerCountOfPodcast
    ) public pure returns (uint256 ownerBadge) {
        // Formula = (x+1)^(1+(x/systemParam))
        // x = very complex formula
    }
}
