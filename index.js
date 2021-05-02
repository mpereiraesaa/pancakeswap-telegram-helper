const ERC20_ABI = require('./erc20.json');
const BASE_TOKEN = require('./baseToken');
const { abi: IUniswapV2Router02ABI } = require('./IUniswapV2Router02.json');
const { MNEMONIC, BOT_TOKEN, OWN_CHAT_ID } = require('./config');

const { ChainId, WETH } = require('@pancakeswap-libs/sdk');
const ethers = require('ethers');
const fetch = require('node-fetch');

const ROUTER_ADDRESS = '0x10ED43C718714eb63d5aA57B78B54704E256024E';

const chainId = ChainId.MAINNET;
const WBNB = WETH[chainId];

const bscProvider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/');

const wallet = ethers.Wallet.fromMnemonic(MNEMONIC);

const account = wallet.connect(bscProvider);

const SAFEMOON_ADDRESS = '0x8076c74c5e3f5852037f31ff0093eeb8c8add8d3';
const NEONIC_ADDRESS = '0x94026f0227cE0c9611e8a228f114F9F19CC3Fa87';
const ZEPPELINDAO_ADDRESS = '0x2E291e1c9f85a86d0C58Ae15621aaC005a8b2EAD';
const HUNDREDXCOIN_ADDRESS = '0x016c285d5b918b92aa85ef1e147498badfe30d69';
const PANTHERSWAP_ADDRESS = '0x1f546ad641b56b86fd9dceac473d1c7a357276b7';

const TOKENS = [
  { address: SAFEMOON_ADDRESS, initial: 1150 },
  { address: NEONIC_ADDRESS, initial: 1000, balance: '28359512275135730814' },
  { address: ZEPPELINDAO_ADDRESS, initial: 100 },
  { address: HUNDREDXCOIN_ADDRESS, initial: 2150 },
  { address: PANTHERSWAP_ADDRESS, initial: 5000 },
];

async function main() {
  const router = new ethers.Contract(ROUTER_ADDRESS, IUniswapV2Router02ABI, account);

  const promises = TOKENS.map(async ({ address: tokenAddress, initial, balance = '0' }) => {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, bscProvider);
    const tokenName = await contract.name();

    let token0InputAmount = ethers.BigNumber.from(BigInt(balance));

    if (token0InputAmount.isZero()) {
      token0InputAmount = await contract.balanceOf(account.address);
    }

    const amounts = await router.getAmountsOut(token0InputAmount, [tokenAddress, WBNB.address]);
    const WBNB_AMOUNT = amounts[1];

    const amounts2 = await router.getAmountsOut(WBNB_AMOUNT, [WBNB.address, BASE_TOKEN.BUSD.address]);
    const outputAmount2 = amounts2[1];
    const BUSD_AMOUNT = ethers.utils.formatUnits(outputAmount2, BASE_TOKEN.BUSD.decimals);

    return [
      `Token: ${tokenName}`,
      `Token Balance: ${token0InputAmount.toString()}`,
      `Initial Invest USD: ${initial}`,
      `Estimated output: ${ethers.utils.formatEther(WBNB_AMOUNT)} ${WBNB.symbol}`,
      `Estimated USD: ${BUSD_AMOUNT}`,
      `Profit/Loss: ${(((parseFloat(BUSD_AMOUNT)/parseFloat(initial))-1)*100).toFixed(2)}%`
    ].join('\n');
  });
  const result = await Promise.all(promises);
  const msg = result.join('\n\n');

  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${OWN_CHAT_ID}&text=${msg}`);
}

main();
