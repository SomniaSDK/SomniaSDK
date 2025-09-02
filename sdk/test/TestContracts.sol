// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Simple Storage Contract for Testing
 */
contract SimpleStorage {
    uint256 private storedValue;
    
    event ValueChanged(uint256 newValue, address changedBy);
    
    constructor() {
        storedValue = 0;
    }
    
    function set(uint256 _value) public {
        storedValue = _value;
        emit ValueChanged(_value, msg.sender);
    }
    
    function get() public view returns (uint256) {
        return storedValue;
    }
    
    function increment() public {
        storedValue += 1;
        emit ValueChanged(storedValue, msg.sender);
    }
    
    function add(uint256 _amount) public {
        storedValue += _amount;
        emit ValueChanged(storedValue, msg.sender);
    }
}

/**
 * Test Token Contract for Advanced Testing
 */
contract TestToken {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
        decimals = 18;
        totalSupply = 1000000 * 10**decimals; // 1 million tokens
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    function transfer(address _to, uint256 _value) public returns (bool) {
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }
    
    function approve(address _spender, uint256 _value) public returns (bool) {
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }
    
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        require(balanceOf[_from] >= _value, "Insufficient balance");
        require(allowance[_from][msg.sender] >= _value, "Insufficient allowance");
        
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        allowance[_from][msg.sender] -= _value;
        
        emit Transfer(_from, _to, _value);
        return true;
    }
    
    // Mint function for testing (only owner)
    function mint(address _to, uint256 _amount) public {
        totalSupply += _amount;
        balanceOf[_to] += _amount;
        emit Transfer(address(0), _to, _amount);
    }
}
