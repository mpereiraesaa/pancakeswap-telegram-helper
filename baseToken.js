const ethers = require('ethers');
const { ChainId, Token } = require('@pancakeswap-libs/sdk');

const chainId = ChainId.MAINNET;
const BUSD_ADDRESS = ethers.utils.getAddress('0xe9e7cea3dedca5984780bafc599bd69add087d56');

module.exports = {
  BUSD: new Token(
    chainId,
    BUSD_ADDRESS,
    18,
    'BUSD',
    'BUSD Token',
  ),
}
