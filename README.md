# Pimlico x BuildBear Tutorial

To set up the tutorial, clone this repository, run install the dependencies, and run `npm start`!

```bash
npm install
npm start
```

# Output for Swapping DAI to USDT on Uniswap V3 with Alto Bundler, ERC20 Paymaster & BuildBear Sandbox

```bash
$ npm start

> pimlico-tutorial-template@1.0.0 start
> tsx index.ts

(node:17224) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("file%3A///D%3A/WORK/BuildBear/buildbear-pimlico/node_modules/tsx/dist/loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
====================================
Smart Account Address: 0xa03Af1e5A78F70d8c7aCDb0ddaa2731E4A56E8FB
====================================
====================================
-------- UserOp to Swap DAI to USDT on Uniswap V3 with Alto ---------
🟠 Balance before transaction:  100.99956781271324068
🟠 DAI Balance before transaction:  85.99999999999986006
🟠 USDT Balance before transaction:  14.970922
====================================
🟠 Approving DAI....
====================================
🟠 Calculating UserOp Cost in DAI....
====================================
🟠 Swapping DAI....
🟢User operation included: https://explorer.dev.buildbear.io/uzair/tx/0x9ea4bc26e6af350aee9fc384a6704bcd87c91aeda0bd3c368f07b6fefb18847d
🟢 Yay!! 🎉🎉 Swapped 1 DAI to 0.9979220000000009 USDT
🟢 Balance after transaction:  100.99956781271324068
🟢 DAI Balance after transaction:  84.999999999999848441
🟢 USDT Balance after transaction:  15.968844
🟢 Max DAI Estimate for UserOp:  1.056731379494445588
🟢 DAI charged for UserOp:  0.000000000000014211
```
