// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {MinimalForwarder as OZMinimalForwarder} from "@openzeppelin/contracts/metatx/MinimalForwarder.sol";

// Wrapper to make MinimalForwarder available as a Hardhat artifact
contract MinimalForwarder is OZMinimalForwarder {}
