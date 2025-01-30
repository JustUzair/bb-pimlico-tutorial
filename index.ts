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
  parseUnits,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { entryPoint07Address } from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";
import { ethers, Interface, Wallet, JsonRpcProvider, parseEther } from "ethers";

import { exit } from "process";
import UniV3Abi from "./utils/ABIs/UniswapV3.json";
import ERC20Abi from "./utils/ABIs/ERC20.json";
import { readContract } from "viem/actions";

const buildbearSandboxUrl = "https://rpc.buildbear.io/uzair";

const BBSandboxNetwork = /*#__PURE__*/ defineChain({
  id: 23351, // IMPORTANT : replace this with your sandbox's chain id
  name: "BuildBear x Polygon Mainnet Sandbox", // name your network
  nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 }, // native currency of forked network
  rpcUrls: {
    default: {
      http: [buildbearSandboxUrl],
    },
  },
  blockExplorers: {
    default: {
      name: "BuildBear x Polygon Mainnet Scan", // block explorer for network
      url: "https://explorer.buildbear.io/uzair",
      apiUrl: "https://api.buildbear.io/uzair/api",
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
console.log("🟠Balance before transaction: ", formatEther(balance));
console.log("🟠DAI Balance before transaction: ", daiBalanceBefore);
console.log("🟠USDC Balance before transaction: ", usdcBalanceBefore);
console.log("====================================");

// const txHash = await smartAccountClient.sendTransaction({
//   to: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
//   value: ethers.parseEther("1"),
//   data: "0x",
// });

let swapParams = {
  tokenIn: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" as `0x${string}`, // DAI
  tokenOut: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`, // USDC
  fee: 3000 as number, //fee
  recipient: account.address, // recipient
  deadline: (Math.floor(Date.now() / 1000) + 60 * 30) as unknown as bigint, // expiration
  amountIn: parseEther("1") as bigint, //amountIn
  amountOutMinimum: 0 as unknown as bigint, //amountOutMinimum
  sqrtPriceLimitX96: 0 as unknown as bigint, //sqrtPriceLimitX96
};
const txHash = await smartAccountClient.sendUserOperation({
  account,
  calls: [
    {
      to: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" as `0x${string}`, //DAI
      abi: parseAbi(["function approve(address,uint)"]),
      functionName: "approve",
      args: ["0xE592427A0AEce92De3Edee1F18E0157C05861564", parseEther("1")],
    },
    {
      to: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
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

await smartAccountClient.waitForUserOperationReceipt({
  hash: txHash,
});

console.log(
  `🟢User operation included: https://explorer.buildbear.io/uzair/tx/${txHash}`
);

balance = await publicClient.getBalance({ address: account.address }); // Get the balance of the sender
let daiBalanceAfter = await getDAIBalance();
let usdcBalanceAfter = await getUSDCBalance();

console.log("🟢 Balance after transaction: ", formatEther(balance));
console.log("🟢 DAI Balance after transaction: ", daiBalanceAfter);
console.log("🟢 USDC Balance after transaction: ", usdcBalanceAfter);
console.log(
  `Swapped ${formatUnits(swapParams.amountIn, 18)} DAI to ${
    +usdcBalanceAfter - +usdcBalanceBefore
  } USDC`
);

exit();
// Helper
async function getUSDCBalance(): Promise<string> {
  let res = await publicClient.readContract({
    address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    abi: ERC20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });
  return formatUnits(res as bigint, 6).toString();
}

async function getDAIBalance(): Promise<string> {
  let res = await publicClient.readContract({
    address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    abi: ERC20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });
  return formatUnits(res as bigint, 18).toString();
}
