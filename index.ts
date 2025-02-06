import "dotenv/config";
import { appendFileSync } from "fs";
import { toSafeSmartAccount } from "permissionless/accounts";
import {
  Hex,
  createPublicClient,
  defineChain,
  encodeAbiParameters,
  encodePacked,
  formatEther,
  formatUnits,
  http,
  parseAbi,
  parseAbiParameters,
  zeroAddress,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { entryPoint07Address } from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";
import { parseEther } from "ethers";
import { exit } from "process";

import ERC20Abi from "./utils/ABIs/ERC20.json";

const DAI_MAINNET =
  `0x6B175474E89094C44Da98b954EedeAC495271d0F` as `0x${string}`;
const USDC_MAINNET =
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`;
const UNI_V4_ROUTER =
  "0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af" as `0x${string}`;

const PERMIT2_Mainnet =
  `0x000000000022D473030F116dDEE9F6B43aC78BA3` as `0x${string}`;
let swapParams = {
  // tokenIn: DAI_MAINNET, // DAI
  // tokenOut: USDC_MAINNET, // USDC
  // fee: 3000 as number, //fee
  // recipient: account.address, // recipient
  deadline: (Math.floor(Date.now() / 1000) + 60 * 4) as unknown, // expiration
  amountIn: parseEther("1") as bigint, //amountIn
  minAmountOut: parseEther("0") as unknown as bigint, //amountOutMinimum
  // sqrtPriceLimitX96: 0 as unknown as bigint, //sqrtPriceLimitX96
  v4UniversalRouter: UNI_V4_ROUTER,
  permit2Address: PERMIT2_Mainnet,
};

// #### Swap Command ####
// Refer to universal router's docs : https://docs.uniswap.org/contracts/universal-router/technical-reference#command
const command_swapExactIn = "0x0a0004" as `0x${string}`;
// const commands_packed = encodePacked(
//   ["bytes"],
//   [command_swapExactIn as command_swapExactIn]
// );

console.log("=============Commands==============");
console.log(command_swapExactIn);
console.log("====================================");
// #### Actions ####
// Refer to official docs: https://docs.uniswap.org/contracts/v4/reference/periphery/libraries/Actions
const actions_swapExactInSingle = 0x04;
const actions_settleAll = 0x10;
const actions_takeAll = 0x13;
const actions_packed = encodePacked(
  ["uint8", "uint8", "uint8"],
  [actions_swapExactInSingle, actions_settleAll, actions_takeAll]
);

const params: `0x${string}`[] = [];

// First parameter: ExactInputSingleParams
params[0] = encodeAbiParameters(
  parseAbiParameters([
    // Using exact struct format from docs
    "((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) poolKey, bool zeroForOne, uint128 amountIn, uint128 amountOutMinimum, bytes hookData)",
  ]),
  [
    {
      poolKey: {
        currency0: DAI_MAINNET,
        currency1: USDC_MAINNET,
        fee: 100,
        tickSpacing: 1,
        hooks: zeroAddress,
      },
      zeroForOne: true,
      amountIn: swapParams.amountIn,
      amountOutMinimum: swapParams.minAmountOut,
      hookData: "0x0" as `0x${string}`,
    },
  ]
);

// Second parameter: input token configuration
params[1] = encodeAbiParameters(
  parseAbiParameters(["(address, uint128)"]), // Note the tuple format
  [[DAI_MAINNET, swapParams.amountIn]]
);

// Third parameter: output token configuration
params[2] = encodeAbiParameters(
  parseAbiParameters(["(address, uint128)"]), // Note the tuple format
  [[USDC_MAINNET, swapParams.minAmountOut]]
);

console.log("=============Params===============");
// console.log(...params);
params.map((param, index) => {
  console.log(`Param ${index + 1} :::: ${param}\n`);
});
console.log("====================================");

// Function Inputs

const actions = encodePacked(
  ["uint8", "uint8", "uint8"],
  [actions_swapExactInSingle, actions_settleAll, actions_takeAll]
);

const inputs: `0x${string}`[] = [];
inputs[0] = encodeAbiParameters(parseAbiParameters(["(bytes,bytes[])"]), [
  [actions, params],
]);
console.log("=============Inputs===============");
inputs.map((input, index) => {
  console.log(`Input ${index + 1} :::: ${input}\n`);
});
console.log("====================================");
// const expiry = Math.floor(Date.now() / 1000) + 60 * 4;
console.log("===========DEADLINE==============");
console.log(swapParams.deadline);
console.log("====================================");
const buildbearSandboxUrl =
  "https://rpc.buildbear.io/historic-vulture-330d1a82";

const BBSandboxNetwork = /*#__PURE__*/ defineChain({
  id: 23543, // IMPORTANT : replace this with your sandbox's chain id
  name: "BuildBear x Ethereum Mainnet Sandbox", // name your network
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, // native currency of forked network
  rpcUrls: {
    default: {
      http: [buildbearSandboxUrl],
    },
  },
  blockExplorers: {
    default: {
      name: "BuildBear x Ethereum Mainnet Scan", // block explorer for network
      url: "https://explorer.buildbear.io/historic-vulture-330d1a82",
      apiUrl: "https://api.buildbear.io/historic-vulture-330d1a82/api",
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
  userOperation: {
    estimateFeesPerGas: async () => {
      return (await pimlicoClient.getUserOperationGasPrice()).fast;
    },
  },
});

let balance = await publicClient.getBalance({ address: account.address }); // Get the balance of the sender
let daiBalanceBefore = await getDAIBalance();
let usdcBalanceBefore = await getUSDCBalance();

if (+balance.toString() <= 0 || +daiBalanceBefore.toString() <= 0) {
  console.log("====================================");
  console.log(
    `⚠️⚠️Fund your Account with DAI & NATIVE tokens from your BuildBear Sandbox Faucet and try running the script again.\nSmart Account Address: ${account.address}`
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
  "-------- UserOp to Swap DAI to USDC on Uniswap V3 with Alto ---------"
);
console.log("🟠 Balance before transaction: ", formatEther(balance));
console.log("🟠 DAI Balance before transaction: ", daiBalanceBefore);
console.log("🟠 USDC Balance before transaction: ", usdcBalanceBefore);
console.log("====================================");

console.log("🟠 Approving DAI....");
console.log("====================================");

const txHash = await smartAccountClient.sendUserOperation({
  account,
  calls: [
    // First approve DAI
    // {
    //   to: DAI_MAINNET,
    //   abi: parseAbi([
    //     "function approve(address spender, uint256 amount) external returns (bool)",
    //   ]),
    //   functionName: "approve",
    //   args: [swapParams.permit2Address, swapParams.amountIn],
    // },
    // Then approve with Permit2
    {
      to: swapParams.permit2Address,
      abi: parseAbi([
        "function approve(address token, address spender, uint160 amount, uint48 expiration)",
      ]),
      functionName: "approve",
      args: [
        DAI_MAINNET,
        swapParams.v4UniversalRouter,
        swapParams.amountIn,
        swapParams.deadline as number,
      ],
    },
    // // Execute the swap
    {
      to: swapParams.v4UniversalRouter,
      abi: parseAbi([
        "function execute(bytes commands, bytes[] inputs, uint256 deadline) external payable",
      ]),
      functionName: "execute",
      args: [command_swapExactIn, inputs, swapParams.deadline as bigint],
    },
  ],
});
console.log("🟠 Swapping DAI....");

let { receipt } = await smartAccountClient.waitForUserOperationReceipt({
  hash: txHash,
  retryCount: 7,
  pollingInterval: 2000,
});

console.log(
  `🟢User operation included: https://explorer.buildbear.io/historic-vulture-330d1a82/tx/${receipt.transactionHash}`
);

balance = await publicClient.getBalance({ address: account.address }); // Get the balance of the sender
let daiBalanceAfter = await getDAIBalance();
let usdcBalanceAfter = await getUSDCBalance();

console.log(
  `🟢 Yay!! 🎉🎉 Swapped ${formatUnits(swapParams.amountIn, 18)} DAI to ${
    +usdcBalanceAfter - +usdcBalanceBefore
  } USDC`
);

console.log("🟢 Balance after transaction: ", formatEther(balance));
console.log("🟢 DAI Balance after transaction: ", daiBalanceAfter);
console.log("🟢 USDC Balance after transaction: ", usdcBalanceAfter);

exit();

// Helper Functions

// get USDC Balance of Smart Account
async function getUSDCBalance(): Promise<string> {
  let res = await publicClient.readContract({
    address: USDC_MAINNET,
    abi: ERC20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });
  console.log("====================================");
  console.log(
    "USDC Balance in ether: ",
    formatUnits(res as bigint, 6).toString()
  );
  console.log("====================================");
  return formatUnits(res as bigint, 6).toString();
}

// get  DAI Balance of Smart Account
async function getDAIBalance(): Promise<string> {
  let res = await publicClient.readContract({
    address: DAI_MAINNET,
    abi: ERC20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });
  console.log("====================================");
  console.log(
    "DAI Balance in ether: ",
    formatUnits(res as bigint, 18).toString()
  );
  console.log("====================================");

  return formatUnits(res as bigint, 18).toString();
}
