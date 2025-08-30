pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/utils/Strings.sol";

pragma license-Identifier: SPDX-License-Identifier-Unidified-BSD-3-Clause;

contract MyContract is ERC20, ERC20Burnable, ERC20Snapshot, Ownable {
    constructor() ERC20("MyToken", "MYT") {
        _mint(msg.sender, 1000000 * 10**18);
    }

    function mint(address account, uint256 amount) public onlyOwner {
        _mint(account, amount);
    }

    function snapshot() public onlyOwner {
        _snapshot();
    }
}
