require('dotenv').config();
const WETH_ABI = require('./weth.json');
const ERC20_ABI = require('./erc20.json');
const { abi: IUniswapV2Router02ABI } = require('./IUniswapV2Router02.json');

const { MNEMONIC } = process.env;

const { ChainId, Token, Fetcher, TokenAmount, Route, Trade, Percent, TradeType, JSBI, Router, WETH, ETHER } = require('@pancakeswap-libs/sdk');
const ethers = require('ethers');

const BIPS_BASE = JSBI.BigInt(10000);
const ROUTER_ADDRESS = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
const chainId = ChainId.MAINNET;
const WBNB = WETH[chainId];

const bscProvider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
const wallet = ethers.Wallet.fromMnemonic(MNEMONIC);
const account = wallet.connect(bscProvider);

console.log("This uses BNB balance to handle swap to/from.");

async function run() {
  const args = process.argv.slice(2);
  const operation = args[0];
  const inputAddress = ethers.utils.getAddress(args[1]);

  if (!args[2]) {
    return;
  }

  const contract = new ethers.Contract(inputAddress, ERC20_ABI, account);
  const router = new ethers.Contract(ROUTER_ADDRESS, IUniswapV2Router02ABI, account);
  
  const tokenName = await contract.name();
  const tokenSymbol = await contract.symbol();
  const decimals = await contract.decimals();
  
  const customToken = new Token(
    chainId,
    inputAddress,
    decimals,
    tokenSymbol || 'UNKNOWN',
    tokenName || 'UNKNOWN',
  );

  console.log(`Working with ${customToken.symbol} - ${customToken.name}`);

  const inputAmount = ethers.utils.parseUnits(args[2], decimals);

  if (operation == 'to') {
    // Get BNB account balance.
    const balance = await account.getBalance();
    console.log(`Wrap ${ethers.utils.formatEther(inputAmount.toString())} BNB to WBNB`);

    const wbnbContract = new ethers.Contract(WBNB.address, WETH_ABI, account);

    const txReceipt = await wbnbContract.deposit({ value: `0x${inputAmount.toString(16)}` });
    console.log(`Deposit Transaction hash: ${txReceipt.hash}`);

    const depositReceipt = await txReceipt.wait();
    console.log(`Transaction was mined in block ${depositReceipt.blockNumber}`);

    inputAmount = await wbnbContract.balanceOf(account.address);

    const Pair = await Fetcher.fetchPairData(WBNB, customToken, bscProvider);
    const route = new Route([Pair], WBNB);
    const trade = new Trade(route, new TokenAmount(WBNB, inputAmount), TradeType.EXACT_INPUT);
    const slippageTolerance = new Percent(JSBI.BigInt(500), BIPS_BASE) // 5%

    const executionPriceFrom = trade.executionPrice.toSignificant(6);
    const executionPriceTo = trade.executionPrice.invert().toSignificant(6);
    const outputAmount = trade.outputAmount.raw.toString();
    const minimumOut = trade.minimumAmountOut(slippageTolerance).raw.toString();

    const stringDisplay = `Balance: ${ethers.utils.formatEther(balance)} ${ETHER.symbol}\n`
      + `${executionPriceFrom} ${WBNB.symbol} -> ${executionPriceTo} ${customToken.symbol}\n`
      + `Estimated output: ${outputAmount} ${customToken.symbol}\n`
      + `Minimum output: ${minimumOut} ${customToken.symbol}`;

    console.log(stringDisplay);

    await wbnbContract.approve(ROUTER_ADDRESS, inputAmount);

    console.log('Contract approval done.');

    const { args, methodName } = Router.swapCallParameters(trade, {
      feeOnTransfer: true,
      allowedSlippage: slippageTolerance,
      recipient: account.address,
      ttl: Date.now() + 1000 * 60 * 10 //10 minutes,
    });

    // const tx = await router[methodName](
    //   ...args, { gasLimit: 245682 },
    // );

    // console.log(`Transaction hash: ${tx.hash}`);

    // const receipt = await tx.wait();
    // console.log(`Transaction was mined in block ${receipt.blockNumber}`);
  }

  if (operation == 'from') {
    const balance = await contract.balanceOf(account.address);
    const Pair = await Fetcher.fetchPairData(customToken, WBNB, bscProvider);
    const route = new Route([Pair], customToken);
    const trade = new Trade(route, new TokenAmount(customToken, inputAmount), TradeType.EXACT_INPUT);
    const slippageTolerance = new Percent(JSBI.BigInt(1700), BIPS_BASE) // 17%

    const executionPriceFrom = trade.executionPrice.toSignificant(6);
    const executionPriceTo = trade.executionPrice.invert().toSignificant(6);
    const outputAmount = trade.outputAmount.raw.toString();
    const minimumOut = trade.minimumAmountOut(slippageTolerance).raw.toString();

    const stringDisplay = `Balance: ${balance} ${customToken.symbol}\n`
      + `${executionPriceFrom} ${customToken.symbol} -> ${executionPriceTo} ${WBNB.symbol}\n`
      + `Estimated output: ${ethers.utils.formatEther(outputAmount)} ${WBNB.symbol}\n`
      + `Minimum output: ${ethers.utils.formatEther(minimumOut)} ${WBNB.symbol}`;

    console.log(stringDisplay);

    await contract.approve(ROUTER_ADDRESS, inputAmount);

    const tx = await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
      inputAmount,
      minimumOut,
      [customToken.address, WBNB.address],
      account.address,
      Date.now() + 1000 * 60 * 1,
      { gasLimit: 100000, gasPrice: ethers.utils.parseUnits('8', 'gwei')},
    );

    console.log(`Transaction hash: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`Transaction was mined in block ${receipt.blockNumber}`);
  }
}

run();
