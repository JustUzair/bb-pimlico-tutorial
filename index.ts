import "dotenv/config";
import { appendFileSync } from "fs";
import { toSafeSmartAccount } from "permissionless/accounts";
import { Hex, createPublicClient, defineChain, formatEther, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { entryPoint07Address } from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";
import { ethers } from "ethers";
import { exit } from "process";

const buildbearSandboxUrl =
  "https://rpc.buildbear.io/parliamentary-katebishop-6df91ec9";

const BBSandboxNetwork = /*#__PURE__*/ defineChain({
  id: 23177, // IMPORTANT : replace this with your sandbox's chain id
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
      url: "https://explorer.buildbear.io/parliamentary-katebishop-6df91ec9",
      apiUrl: "https://api.buildbear.io/parliamentary-katebishop-6df91ec9/api",
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

if (+balance.toString() <= 0) {
  console.log("====================================");
  console.log(
    `⚠️⚠️Fund your Account with your BuildBear Sandbox Faucet and try running the script again.\nSmart Account Address: ${account.address}`
  );
  console.log("====================================");
  exit();
} else {
  console.log("====================================");
  console.log(`Smart Account Address: ${account.address}`);
  console.log("====================================");
}

console.log("🟠Balance before transaction: ", formatEther(balance));

const txHash = await smartAccountClient.sendTransaction({
  to: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
  value: ethers.parseEther("1"),
  data: "0x",
});

console.log(
  `🟢User operation included: https://explorer.buildbear.io/parliamentary-katebishop-6df91ec9/tx/${txHash}`
);

balance = await publicClient.getBalance({ address: account.address }); // Get the balance of the sender

console.log("🟠Balance after transaction: ", formatEther(balance));
