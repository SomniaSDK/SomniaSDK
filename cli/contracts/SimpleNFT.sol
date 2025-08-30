// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SimpleNFT {
    string public name;
    string public symbol;
    address public owner;
    uint256 public maxSupply;
    bool public publicMintEnabled;
    
    mapping(uint256 => address) public ownerOf;
    mapping(uint256 => string) public tokenURI;
    mapping(address => uint256) public balanceOf;
    
    uint256 public totalSupply;
    
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    
    constructor(
        string memory _name, 
        string memory _symbol, 
        address _owner,
        uint256 _maxSupply,
        bool _publicMintEnabled
    ) {
        name = _name;
        symbol = _symbol;
        owner = _owner;
        maxSupply = _maxSupply;
        publicMintEnabled = _publicMintEnabled;
    }
    
    function mint(address to, uint256 tokenId, string memory uri) external {
        require(msg.sender == owner, "Only owner can mint");
        require(totalSupply < maxSupply, "Max supply reached");
        require(ownerOf[tokenId] == address(0), "Token already exists");
        
        ownerOf[tokenId] = to;
        tokenURI[tokenId] = uri;
        balanceOf[to]++;
        totalSupply++;
        
        emit Transfer(address(0), to, tokenId);
    }
}
