import "dotenv/config";
import { appendFileSync } from "fs";
import { toSafeSmartAccount } from "permissionless/accounts";
import { Hex, createPublicClient, defineChain, formatEther, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { entryPoint07Address } from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";
import { parseEther } from "ethers";
import { exit } from "process";

const buildbearSandboxUrl = "https://rpc.buildbear.io/<SANDBOX-ID>"; // https://rpc.buildbear.io/<SANDBOX-ID>

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
      url: "https://explorer.buildbear.io/<SANDBOX-ID>", // https://explorer.buildbear.io/<SANDBOX-ID>
      apiUrl: "https://api.buildbear.io/<SANDBOX-ID>/api", // https://api.buildbear.io/<SANDBOX-ID>/api
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
  transport: http(buildbearSandboxUrl),
});

const pimlicoClient = createPimlicoClient({
  transport: http(buildbearSandboxUrl), // all pimlico requests are handled by buildbear sandbox rpc: https://rpc.buildbear.io/<SANDBOX-ID>
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

if (process.argv[2] == "--all") {
  await actionSendTransaction();
  await actionSendUserOp();
  await actionEstimateUserOpGas();
  await actionGetUserOpReceipt();
  await actionGetUserOpByHash();
  await actionGetSupportedEntryPoints();
  await actionGetUserOpGasPrice();
  await actionGetUserOpStatus();
  exit();
} else if (process.argv[2] == "--send-transaction") {
  await actionSendTransaction();
  exit();
} else if (process.argv[2] == "--send-userOp") {
  await actionSendUserOp();
  exit();
} else if (process.argv[2] == "--estimate-userOp-gas") {
  await actionEstimateUserOpGas();
  exit();
} else if (process.argv[2] == "--get-userOp-receipt") {
  await actionGetUserOpReceipt();
  exit();
} else if (process.argv[2] == "--get-userOp-by-hash") {
  await actionGetUserOpByHash();
  exit();
} else if (process.argv[2] == "--get-supported-entrypoints") {
  await actionGetSupportedEntryPoints();
  exit();
} else if (process.argv[2] == "--get-userOp-gasPrice") {
  await actionGetUserOpGasPrice();
  exit();
} else if (process.argv[2] == "--get-userOp-status") {
  await actionGetUserOpStatus();
  exit();
}

async function actionSendTransaction() {
  await printBalanceBefore();

  const txHash = await smartAccountClient.sendTransaction({
    to: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
    value: parseEther("1"),
    data: "0x",
  });

  console.log(
    `🟢User operation included: https://explorer.buildbear.io/<SANDBOX-ID>/tx/${txHash}`
  );
  await printBalanceAfter();
}

async function actionSendUserOp() {
  await printBalanceBefore();
  const txHash = await smartAccountClient.sendUserOperation({
    account,
    calls: [
      {
        to: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        value: parseEther("1"),
      },
    ],
  });

  let result = await smartAccountClient.waitForUserOperationReceipt({
    hash: txHash,
  });

  console.log(
    `🟢User operation included: https://explorer.buildbear.io/<SANDBOX-ID>/tx/${result.receipt.transactionHash}`
  );
  await printBalanceAfter();
}

async function actionEstimateUserOpGas() {
  const gasEstimationObject = await smartAccountClient.estimateUserOperationGas(
    {
      account,
      calls: [
        {
          to: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
          value: parseEther("1"),
        },
      ],
    }
  );

  const gasEstimation = gasEstimationObject.paymasterPostOpGasLimit;
  console.log(`🟢User Operation's Gas Estimate`);
  console.log(gasEstimationObject);
}

async function actionGetUserOpReceipt() {
  const txHash = await smartAccountClient.sendUserOperation({
    account,
    calls: [
      {
        to: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        value: parseEther("1"),
      },
    ],
  });

  await smartAccountClient.waitForUserOperationReceipt({
    hash: txHash,
  });

  let userOperationReceipt = await smartAccountClient.getUserOperationReceipt({
    hash: txHash,
  });
  console.log(`🟢User operation Receipt\n`, userOperationReceipt);
}
async function actionGetUserOpByHash() {
  const txHash = await smartAccountClient.sendUserOperation({
    account,
    calls: [
      {
        to: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        value: parseEther("1"),
      },
    ],
  });

  await smartAccountClient.waitForUserOperationReceipt({
    hash: txHash,
  });

  let userOperationResult = await smartAccountClient.getUserOperation({
    hash: txHash,
  });
  console.log(`🟢User operation Result\n`, userOperationResult);
}
async function actionGetSupportedEntryPoints() {
  let result = await smartAccountClient.getSupportedEntryPoints();

  console.log(`🟢 Supported Entrypoints:`, result.join(", "));
}
async function actionGetUserOpGasPrice() {
  let userOpGasPrice = await pimlicoClient.getUserOperationGasPrice();
  console.log(`🟢User operation Gas Price\n`, userOpGasPrice);
}
async function actionGetUserOpStatus() {
  const txHash = await smartAccountClient.sendUserOperation({
    account,
    calls: [
      {
        to: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        value: parseEther("1"),
      },
    ],
  });
  let userOpStatus = await pimlicoClient.getUserOperationStatus({
    hash: txHash,
  });
  console.log(`🟠User operation status\n`, userOpStatus);
  await smartAccountClient.waitForUserOperationReceipt({
    hash: txHash,
  });
  userOpStatus = await pimlicoClient.getUserOperationStatus({
    hash: txHash,
  });
  console.log(`🟢User operation status\n`, userOpStatus);
}

// Helper Funciton

async function getBalance(): Promise<bigint> {
  let balance = await publicClient.getBalance({ address: account.address });
  return balance;
}
async function printBalanceBefore() {
  let balance = await getBalance();
  console.log("🟠Balance before transaction: ", formatEther(balance));
}

async function printBalanceAfter() {
  let balance = await getBalance();
  console.log("🟠Balance after transaction: ", formatEther(balance));
}
