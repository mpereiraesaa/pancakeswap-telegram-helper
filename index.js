require('dotenv').config();
const ERC20_ABI = require('./erc20.json');
const BASE_TOKEN = require('./baseToken');
const TOKENS = require('./portfolio');
const { abi: IUniswapV2Router02ABI } = require('./IUniswapV2Router02.json');
const { MNEMONIC, BOT_TOKEN, OWN_CHAT_ID } = process.env;

const ethers = require('ethers');
const fetch = require('node-fetch');

const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

const bscProvider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/');

const wallet = ethers.Wallet.fromMnemonic(MNEMONIC);

const account = wallet.connect(bscProvider);

async function main() {
  const promises = TOKENS.map(async ({ address: tokenAddress, initial, balance = '0', router: routerAddress }) => {
    const router = new ethers.Contract(routerAddress, IUniswapV2Router02ABI, account);
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, bscProvider);
    const tokenName = await contract.name();

    let token0InputAmount = ethers.BigNumber.from(BigInt(balance));

    if (token0InputAmount.isZero()) {
      token0InputAmount = await contract.balanceOf(account.address);
    }

    const amounts = await router.getAmountsOut(token0InputAmount, [tokenAddress, WBNB]);
    const WBNB_AMOUNT = amounts[1];

    const amounts2 = await router.getAmountsOut(WBNB_AMOUNT, [WBNB, BASE_TOKEN.BUSD.address]);
    const outputAmount2 = amounts2[1];
    const BUSD_AMOUNT = ethers.utils.formatUnits(outputAmount2, BASE_TOKEN.BUSD.decimals);

    return [
      `Token: ${tokenName}`,
      `Token Balance: ${token0InputAmount.toString()}`,
      `Initial Invest USD: ${initial}`,
      `Estimated output: ${ethers.utils.formatEther(WBNB_AMOUNT)} WBNB`,
      `Estimated USD: ${BUSD_AMOUNT}`,
      `Profit/Loss: ${(((parseFloat(BUSD_AMOUNT)/parseFloat(initial))-1)*100).toFixed(2)}%`
    ].join('\n');
  });
  const result = await Promise.all(promises);
  const msg = result.join('\n\n');

  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${OWN_CHAT_ID}&text=${msg}`);
}

main();
