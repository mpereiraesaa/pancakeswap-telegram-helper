const { ChainId, Token } = require('@pancakeswap-libs/sdk');

const chainId = ChainId.MAINNET;
const WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const BUSD_ADDRESS = '0xe9e7cea3dedca5984780bafc599bd69add087d56';

module.exports = {
  WBNB: new Token(
    chainId,
    WBNB_ADDRESS,
    18,
    'WBNB',
    'Wrapped BNB'
  ),
  BUSD: new Token(
    chainId,
    BUSD_ADDRESS,
    18,
    'BUSD',
    'BUSD Token',
  ),
}
