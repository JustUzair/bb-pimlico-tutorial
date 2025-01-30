import { ethers, Interface, Wallet, JsonRpcProvider, parseEther } from "ethers";
import "dotenv/config";

// Uniswap V3 SwapRouter address on Polygon
const swapRouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

// Uniswap V3 ABI
const swapRouterABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256)",
];

// Polygon RPC Provider (Use Tenderly, BuildBear, or Alchemy)
const provider = new JsonRpcProvider("https://rpc.buildbear.io/uzair");

// Signer (Replace with your actual private key)
const wallet = new Wallet(process.env.PRIVATE_KEY as string, provider);
const swapRouter = new ethers.Contract(
  swapRouterAddress,
  swapRouterABI,
  wallet
);

// Define the swap parameters
const params = {
  tokenIn: "0x0000000000000000000000000000000000001010", // MATIC
  tokenOut: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC
  fee: 3000, // 0.3% Uniswap fee tier
  recipient: wallet.address, // Your wallet address
  deadline: Math.floor(Date.now() / 1000) + 60 * 10, // 10-minute deadline
  amountIn: parseEther("1"), // 1 MATIC
  amountOutMinimum: 0, // Accept any amount of USDC
  sqrtPriceLimitX96: 0, // No price limit
};

// Encode calldata (fix: explicitly structure the params)
const iface = new Interface(swapRouterABI);
const calldata = iface.encodeFunctionData("exactInputSingle", [{ ...params }]);

console.log("====================================");
console.log(params);
console.log("====================================");
console.log("Calldata for Uniswap V3 swap:", calldata);
