pragma solidity ^0.8.19;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/ERC721.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/Counters.sol";

pragma solidity >=0.6.0;

/**
 * @title ERC721Contract
 * @author Your Name
 * @dev ERC721 NFT contract
 */
contract ERC721Contract is ERC721Enumerable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;

    constructor(string memory name, string memory symbol) public ERC721Enumerable(name, symbol) {
        _grantRole(_MINTER_ROLE, msg.sender);
    }

    function mint(address owner, string memory tokenURI) public {
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _mint(owner, newItemId);
        _setTokenURI(newItemId, tokenURI);
    }

    function _mint(address to, uint256 tokenId) internal virtual {
        super._mint(to, tokenId);
    }

    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
        require(_exists(tokenId), "ERC721: minting to the zero address");
        _tokenURIs[tokenId] = _tokenURI;
    }
}

// SPDX-License-Identifier: MIT
