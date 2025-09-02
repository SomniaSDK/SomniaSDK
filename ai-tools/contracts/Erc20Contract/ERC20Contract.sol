pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Mintable.sol";

// SPDX-License-Identifier: MIT

contract ERC20Contract is ERC20, ERC20Burnable, ERC20Mintable {
    constructor(string memory name, string memory symbol) public ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * (10 ** decimals()));
    }
}
