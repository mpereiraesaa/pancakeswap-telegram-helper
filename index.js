const ERC20_ABI = require('./erc20.json');
const ERC20_ABI_BYTES32 = require('./erc20_bytes32.json');
const BASE_TOKEN = require('./baseToken');
const { MNEMONIC, BOT_TOKEN, OWN_CHAT_ID } = require('./config');

const { parseBytes32String } = require('@ethersproject/strings');
const { ChainId, Token, Fetcher, TokenAmount } = require('@pancakeswap-libs/sdk');
const ethers = require('ethers');
const fetch = require('node-fetch');

const BYTES32_REGEX = /^0x[a-fA-F0-9]{64}$/;

const chainId = ChainId.MAINNET;

const bscProvider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/');

const wallet = ethers.Wallet.fromMnemonic(MNEMONIC);

const account = wallet.connect(bscProvider);

const SAFEMOON_ADDRESS = '0x8076c74c5e3f5852037f31ff0093eeb8c8add8d3';
const PIG_ADDRESS = '0x8850d2c68c632e3b258e612abaa8fada7e6958e5';

const TOKENS = [{ address: SAFEMOON_ADDRESS, initial: 200 }, { address: PIG_ADDRESS, initial: 1000 }];

async function main() {
  const promises = TOKENS.map(async ({ address: tokenAddress, initial }) => {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, bscProvider);
    const contractBytes32 = new ethers.Contract(tokenAddress, ERC20_ABI_BYTES32, bscProvider);
  
    const tokenName = await contract.name();
    const tokenNameBytes32 = await contractBytes32.name();
    const tokenSymbol = await contract.symbol();
    const tokenSymbolBytes32 = await contractBytes32.symbol();
    const decimals = await contract.decimals();
  
    const token0 = new Token(
      chainId,
      tokenAddress,
      decimals,
      tokenSymbol && tokenSymbol.length > 0 ? tokenSymbol : BYTES32_REGEX.test(tokenSymbolBytes32) ? parseBytes32String(tokenSymbolBytes32) : 'UNKNOWN',
      tokenName && tokenName.length > 0 ? tokenName : BYTES32_REGEX.test(tokenNameBytes32) ? parseBytes32String(tokenNameBytes32) : 'UNKNOWN',
    );
  
    const token0InputAmount = await contract.balanceOf(account.address);
    const Pair = await Fetcher.fetchPairData(token0, BASE_TOKEN.WBNB, bscProvider);
    const outputAmount = Pair.getOutputAmount(new TokenAmount(token0, token0InputAmount));
    const WBNB_AMOUNT = outputAmount[0].raw.toString();
  
    const Pair2 = await Fetcher.fetchPairData(BASE_TOKEN.WBNB, BASE_TOKEN.BUSD, bscProvider);
    const outputAmount2 = Pair2.getOutputAmount(new TokenAmount(BASE_TOKEN.WBNB, BigInt(outputAmount[0].raw) ));
    const BUSD_AMOUNT = ethers.utils.formatUnits(outputAmount2[0].raw.toString(), BASE_TOKEN.BUSD.decimals);
  
    return [
      `Token: ${token0.name}`,
      `Token Balance: ${token0InputAmount}`,
      `Initial Invest USD: ${initial}`,
      `Estimated output: ${ethers.utils.formatEther(WBNB_AMOUNT)} ${BASE_TOKEN.WBNB.symbol}`,
      `Estimated USD: ${BUSD_AMOUNT}`,
      `Profit/Loss: ${(((parseFloat(BUSD_AMOUNT)/parseFloat(initial))-1)*100).toFixed(2)}%`
    ].join('\n');
  });
  const result = await Promise.all(promises);
  const msg = result.join('\n\n');

  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${OWN_CHAT_ID}&text=${msg}`);
}

main();
