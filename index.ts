import "dotenv/config";
import { appendFileSync, writeFileSync } from "fs";
import { toSafeSmartAccount } from "permissionless/accounts";
import {
  Hex,
  createPublicClient,
  defineChain,
  formatEther,
  getContract,
  http,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { createPimlicoClient } from "permissionless/clients/pimlico";

import { entryPoint07Address } from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";

import { ethers } from "ethers";

const buildbearSandboxUrl =
  "https://rpc.dev.buildbear.io/rival-deadpool-e1ac7a6e";

export const BBSandboxNetwork = /*#__PURE__*/ defineChain({
  id: 11367,
  name: "BB",
  nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  rpcUrls: {
    default: {
      http: [buildbearSandboxUrl],
    },
  },
  blockExplorers: {
    default: {
      name: "BB National Scarletwitch Scan",
      url: "https://explorer.dev.buildbear.io/rival-deadpool-e1ac7a6e",
      apiUrl: "https://api.dev.buildbear.io/rival-deadpool-e1ac7a6e/api",
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
  // paymaster: pimlicoClient,
  userOperation: {
    estimateFeesPerGas: async () => {
      return (await pimlicoClient.getUserOperationGasPrice()).fast;
    },
  },
});

let balance = await publicClient.getBalance({ address: account.address }); // Get the balance of the sender

console.log("Balance before transaction: ", formatEther(balance));

const txHash = await smartAccountClient.sendTransaction({
  to: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
  value: ethers.parseEther("1"),
  data: "0x",
});

console.log(
  `User operation included: https://explorer.dev.buildbear.io/rival-deadpool-e1ac7a6e/tx/${txHash}`
);

balance = await publicClient.getBalance({ address: account.address }); // Get the balance of the sender

console.log("Balance after transaction: ", formatEther(balance));
