import "dotenv/config";
import { appendFileSync, writeFileSync } from "fs";
import { toSafeSmartAccount } from "permissionless/accounts";
import { Hex, createPublicClient, defineChain, getContract, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
// import { polygon } from "viem/chains";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import {
  createBundlerClient,
  entryPoint07Address,
} from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";

import { getAddress, maxUint256, parseAbi } from "viem";
import { EntryPointVersion } from "viem/account-abstraction";

import { encodeFunctionData, parseAbiItem } from "viem";

const apiKey = process.env.PIMLICO_API_KEY;
if (!apiKey) throw new Error("Missing PIMLICO_API_KEY");

const polygon = /*#__PURE__*/ defineChain({
  id: 137,
  name: "Polygon",
  nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc.dev.buildbear.io/national-scarletwitch-c11333f2"],
    },
  },
  blockExplorers: {
    default: {
      name: "PolygonScan",
      url: "https://explorer.dev.buildbear.io/national-scarletwitch-c11333f2",
      //   apiUrl: "https://api.polygonscan.com/api",
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 25770160,
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
  chain: polygon,
  transport: http(
    "https://rpc.dev.buildbear.io/national-scarletwitch-c11333f2"
    // "https://endpoints.omniatech.io/v1/matic/mainnet/public"
  ), //@>>> Put in buildbear rpc
});

const pimlicoUrl = `https://api.pimlico.io/v2/137/rpc?apikey=${apiKey}`; // @>>> Get the api key and rpc from pimlico dashboard

const pimlicoClient = createPimlicoClient({
  transport: http(pimlicoUrl),
  entryPoint: {
    address: entryPoint07Address,
    version: "0.7",
  },
});

const account = await toSafeSmartAccount({
  client: publicClient,
  owners: [privateKeyToAccount(privateKey)],
  entryPoint: {
    address: entryPoint07Address,
    version: "0.7",
  }, // global entrypoint
  version: "1.4.1",
});

console.log("====================================");
console.log(
  `Smart account address: https://explorer.dev.buildbear.io/national-scarletwitch-c11333f2/address/${account.address}`
);
console.log("====================================");

// console.log("====================================");
// console.log(
//   `Smart account address: https://polygonscan.com/address/${account.address}`
// );
// console.log("====================================");

const smartAccountClient = createSmartAccountClient({
  account,
  chain: polygon,
  bundlerTransport: http(pimlicoUrl),
  paymaster: pimlicoClient,
  userOperation: {
    estimateFeesPerGas: async () => {
      return (await pimlicoClient.getUserOperationGasPrice()).fast;
    },
  },
});

const txHash = await smartAccountClient.sendTransaction({
  to: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
  value: 0n,
  data: "0x1234",
});

console.log(
  `User operation included: https://explorer.dev.buildbear.io/national-scarletwitch-c11333f2/tx/${txHash}`
);
