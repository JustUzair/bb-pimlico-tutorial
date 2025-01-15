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
import { ethers, getBigInt } from "ethers";

const apiKey = process.env.PIMLICO_API_KEY;
const pimlicoUrl = `https://api.pimlico.io/v2/137/rpc?apikey=${apiKey}`; // @>>> Get the api key and rpc from pimlico dashboard

const buildbearSandboxUrl =
  "https://rpc.dev.buildbear.io/rival-deadpool-e1ac7a6e";
if (!apiKey) throw new Error("Missing PIMLICO_API_KEY");
export const BBSandboxNetwork = /*#__PURE__*/ defineChain({
  id: 137,
  name: "BB",
  nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc.dev.buildbear.io/rival-deadpool-e1ac7a6e"],
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
  transport: http(
    buildbearSandboxUrl
    // "https://endpoints.omniatech.io/v1/matic/mainnet/public"
  ), //@>>> Put in buildbear rpc
});

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

console.log("\n\n====================================");
console.log("====================================");
console.log(
  `Smart account address: https://explorer.dev.buildbear.io/rival-deadpool-e1ac7a6e/address/${account.address}`
);
console.log("====================================");
console.log("====================================");

// console.log("====================================");
// console.log(
//   `Smart account address: https://polygonscan.com/address/${account.address}`
// );
// console.log("====================================");

const smartAccountClient = createSmartAccountClient({
  account,
  chain: BBSandboxNetwork,
  bundlerTransport: http(buildbearSandboxUrl), //sending the tx to buildbear
  // paymaster: pimlicoClient,
  // userOperation: {
  //   estimateFeesPerGas: async () => {
  //     return (await pimlicoClient.getUserOperationGasPrice()).fast;
  //   },
  // },
});

const txHash = await smartAccountClient.sendUserOperation({
  sender: account.address,
  nonce: await smartAccountClient.account.getNonce(),
  factory: "0xd703aaE79538628d27099B8c4f621bE4CCd142d5",
  factoryData:
    "0xc5265d5d000000000000000000000000aac5d4240af87249b3f71bc8e4a2cae074a3e4190000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001243c3b752b01845ADb2C711129d4f3966735eD98a9F09fC4cE570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000014375d883Cb4afb913aC35c4B394468C4bC73d77C40000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  callData:
    "0xe9ae5c5300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000003400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  callGasLimit: getBigInt("0x13880"),
  verificationGasLimit: getBigInt("0x60B01"),
  preVerificationGas: getBigInt("0xD3E3"),
  maxPriorityFeePerGas: getBigInt("0x3B9ACA00"),
  maxFeePerGas: getBigInt("0x7A5CF70D5"),
  // paymaster: pimlicoClient.account?.address,
  // paymasterVerificationGasLimit: getBigInt("0x0"),
  // paymasterPostOpGasLimit: getBigInt("0x0"),
  // paymasterData: "0x",
  signature:
    "0xa6cc6589c8bd561cfd68d7b6b0757ef6f208e7438782939938498eee7d703260137856c840c491b3d415956265e81bf5c2184a725be2abfc365f7536b6af525e1c",
});

console.log(
  `User operation included: https://explorer.dev.buildbear.io/rival-deadpool-e1ac7a6e/tx/${txHash}`
);
