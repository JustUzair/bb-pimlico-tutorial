import "dotenv/config";
import { appendFileSync } from "fs";
import { toSafeSmartAccount } from "permissionless/accounts";
import {
  Hex,
  createPublicClient,
  defineChain,
  formatEther,
  formatUnits,
  http,
  parseAbi,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { entryPoint07Address, UserOperation } from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";
import { parseEther } from "ethers";
import { exit } from "process";
import ERC20Abi from "./utils/ABIs/ERC20.json";

const buildbearSandboxUrl = "https://rpc.dev.buildbear.io/sticky-clea-edd665b2";

const BBSandboxNetwork = /*#__PURE__*/ defineChain({
  id: 11480, // IMPORTANT : replace this with your sandbox's chain id
  name: "BuildBear x Polygon Mainnet Sandbox", // name your network
  nativeCurrency: { name: "BBETH", symbol: "BBETH", decimals: 18 }, // native currency of forked network
  rpcUrls: {
    default: {
      http: [buildbearSandboxUrl],
    },
  },
  blockExplorers: {
    default: {
      name: "BuildBear x Polygon Mainnet Scan", // block explorer for network
      url: "https://explorer.dev.buildbear.io/sticky-clea-edd665b2",
      apiUrl: "https://api.dev.buildbear.io/sticky-clea-edd665b2/api",
    },
  },
});

const privateKey = (process.env.PRIVATE_KEY as Hex)
  ? (process.env.PRIVATE_KEY as Hex)
  : (() => {
      const pk = generatePrivateKey();
      appendFileSync(".env", `\nPRIVATE_KEY=${pk}`);
      return pk;
    })();

export const publicClient = createPublicClient({
  chain: BBSandboxNetwork,
  transport: http(buildbearSandboxUrl), //@>>> Put in buildbear rpc
});

const pimlicoClient = createPimlicoClient({
  transport: http(buildbearSandboxUrl),
  entryPoint: {
    address: entryPoint07Address,
    version: "0.7",
  },
});

const signer = privateKeyToAccount(privateKey);
const account = await toSafeSmartAccount({
  client: publicClient,
  owners: [signer],

  entryPoint: {
    address: entryPoint07Address,
    version: "0.7",
  }, // global entrypoint
  version: "1.4.1",
});

const smartAccountClient = createSmartAccountClient({
  account,
  chain: BBSandboxNetwork,
  bundlerTransport: http(buildbearSandboxUrl), //sending the tx to buildbear
  paymaster: pimlicoClient,
  userOperation: {
    estimateFeesPerGas: async () => {
      return (await pimlicoClient.getUserOperationGasPrice()).fast;
    },
  },
});

let balance = await publicClient.getBalance({ address: account.address }); // Get the balance of the sender
let daiBalanceBefore = await getDAIBalance();
let usdtBalanceBefore = await getUSDTBalance();

if (+daiBalanceBefore.toString() <= 0) {
  console.log("====================================");
  console.log(
    `⚠️⚠️Fund your Account with DAI tokens from your BuildBear Sandbox Faucet and try running the script again.\nSmart Account Address: ${account.address}`
  );
  console.log("====================================");
  exit();
} else {
  console.log("====================================");
  console.log(`Smart Account Address: ${account.address}`);
  console.log("====================================");
}

console.log("====================================");

console.log(
  "-------- UserOp to Swap DAI to USDT on Uniswap V3 with Alto ---------"
);
console.log("🟠 Balance before transaction: ", formatEther(balance));
console.log("🟠 DAI Balance before transaction: ", daiBalanceBefore);
console.log("🟠 USDT Balance before transaction: ", usdtBalanceBefore);
console.log("====================================");

let swapParams = {
  tokenIn: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" as `0x${string}`, // DAI
  tokenOut: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as `0x${string}`, // USDT
  fee: 3000 as number, //fee
  recipient: account.address, // recipient
  deadline: (Math.floor(Date.now() / 1000) + 60 * 2) as unknown as bigint, // expiration
  amountIn: parseEther("1") as bigint, //amountIn
  amountOutMinimum: 0 as unknown as bigint, //amountOutMinimum
  sqrtPriceLimitX96: 0 as unknown as bigint, //sqrtPriceLimitX96
  v3Router: "0xE592427A0AEce92De3Edee1F18E0157C05861564" as `0x${string}`,
  paymasterV7Address:
    "0x0000000000000039cd5e8ae05257ce51c473ddd1" as `0x${string}`,
};

console.log("🟠 Approving DAI....");
console.log("====================================");

console.log("🟠 Calculating UserOp Cost in DAI....");

// Get quotes for tokens in array on given network
const quotes = await pimlicoClient.getTokenQuotes({
  chain: BBSandboxNetwork,
  tokens: [swapParams.tokenIn],
});

// extract post op gas, exchange rate and paymaster from quotes
const { postOpGas, exchangeRate, paymaster } = quotes[0];

// prepare user operation & calculating the estimate
const userOperation: UserOperation<"0.7"> =
  await smartAccountClient.prepareUserOperation({
    calls: [
      {
        to: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" as `0x${string}`, //DAI
        abi: parseAbi(["function approve(address,uint)"]),
        functionName: "approve",
        args: [swapParams.v3Router, parseEther("1")],
      },
      {
        to: swapParams.v3Router, //UniV3 Router
        abi: parseAbi([
          "function exactInputSingle((address, address , uint24 , address , uint256 , uint256 , uint256 , uint160)) external payable returns (uint256 amountOut)",
        ]),
        functionName: "exactInputSingle",
        args: [
          [
            swapParams.tokenIn,
            swapParams.tokenOut,
            swapParams.fee,
            swapParams.recipient,
            swapParams.deadline,
            swapParams.amountIn,
            swapParams.amountOutMinimum,
            swapParams.sqrtPriceLimitX96,
          ],
        ],
      },
    ],
  });

// calculate max cost in token
const userOperationMaxGas =
  userOperation.preVerificationGas +
  userOperation.callGasLimit +
  userOperation.verificationGasLimit +
  (userOperation.paymasterPostOpGasLimit || 0n) +
  (userOperation.paymasterVerificationGasLimit || 0n);

// calculate max cost in token
const userOperationMaxCost = userOperationMaxGas * userOperation.maxFeePerGas;

// using formula here https://github.com/pimlicolabs/singleton-paymaster/blob/main/src/base/BaseSingletonPaymaster.sol#L334-L341
const maxCostInToken =
  ((userOperationMaxCost + postOpGas * userOperation.maxFeePerGas) *
    exchangeRate) /
  BigInt(1e18);
console.log("====================================");

const txHash = await smartAccountClient.sendUserOperation({
  account,
  calls: [
    {
      to: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" as `0x${string}`, //DAI
      abi: parseAbi(["function approve(address,uint)"]),
      functionName: "approve",
      args: [swapParams.paymasterV7Address, maxCostInToken],
    },
    {
      to: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" as `0x${string}`, //DAI
      abi: parseAbi(["function approve(address,uint)"]),
      functionName: "approve",
      args: [swapParams.v3Router, parseEther("1")],
    },
    {
      to: swapParams.v3Router, //UniV3 Router
      abi: parseAbi([
        "function exactInputSingle((address, address , uint24 , address , uint256 , uint256 , uint256 , uint160)) external payable returns (uint256 amountOut)",
      ]),
      functionName: "exactInputSingle",
      args: [
        [
          swapParams.tokenIn,
          swapParams.tokenOut,
          swapParams.fee,
          swapParams.recipient,
          swapParams.deadline,
          swapParams.amountIn,
          swapParams.amountOutMinimum,
          swapParams.sqrtPriceLimitX96,
        ],
      ],
    },
  ],
  paymasterContext: {
    token: swapParams.tokenIn,
  },
});
console.log("🟠 Swapping DAI....");

let { receipt } = await smartAccountClient.waitForUserOperationReceipt({
  hash: txHash,
  retryCount: 7,
  pollingInterval: 2000,
});

console.log(
  `🟢User operation included: https://explorer.dev.buildbear.io/sticky-clea-edd665b2/tx/${receipt.transactionHash}`
);

balance = await publicClient.getBalance({ address: account.address }); // Get the balance of the sender
let daiBalanceAfter = await getDAIBalance();
let usdtBalanceAfter = await getUSDTBalance();

console.log(
  `🟢 Yay!! 🎉🎉 Swapped ${formatUnits(swapParams.amountIn, 18)} DAI to ${
    +usdtBalanceAfter - +usdtBalanceBefore
  } USDT`
);

console.log("🟢 Balance after transaction: ", formatEther(balance));
console.log("🟢 DAI Balance after transaction: ", daiBalanceAfter);
console.log("🟢 USDT Balance after transaction: ", usdtBalanceAfter);
console.log("🟢 Max DAI Estimate for UserOp: ", formatEther(maxCostInToken));
console.log(
  "🟢 DAI charged for UserOp: ",
  (+daiBalanceBefore - +daiBalanceAfter - 1).toFixed(18).replace(/\.?0+$/, "") // Adjust decimal places as needed
);

exit();

// Helper Functions

// get USDT Balance of Smart Account
async function getUSDTBalance(): Promise<string> {
  let res = await publicClient.readContract({
    address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    abi: ERC20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });
  return formatUnits(res as bigint, 6).toString();
}

// get DAI Balance of Smart Account
async function getDAIBalance(): Promise<string> {
  let res = await publicClient.readContract({
    address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    abi: ERC20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });
  return formatUnits(res as bigint, 18).toString();
}
