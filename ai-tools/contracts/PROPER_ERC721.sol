// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ERC721Contract
 * @dev A simple ERC721 NFT contract
 */
contract ERC721Contract is ERC721, Ownable {
    uint256 private _tokenIdCounter;

    constructor() ERC721("ERC721Contract", "ERC721") Ownable(msg.sender) {}

    function mint(address to) public onlyOwner {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        _safeMint(to, tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked("https://api.example.com/token/", tokenId));
    }
}
