# Pimlico x BuildBear Tutorial

To set up the tutorial, clone this repository, run install the dependencies, and run `npm start`!

```bash
git clone https://github.com/JustUzair/bb-pimlico-tutorial.git
git checkout univ3-verifying-paymaster
npm install
npm start
```

# Output for Swapping DAI to USDT on Uniswap V3 with Alto Bundler, Verifying Paymaster & BuildBear Sandbox

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
🟠 Balance before transaction:  0
🟠 DAI Balance before transaction:  98.999999999998786748
🟠 USDT Balance before transaction:  0.998077
====================================
🟠 Approving DAI....
====================================
🟠 Calculating UserOp Cost in DAI....
====================================
🟠 Swapping DAI....
🟢User operation included: https://explorer.dev.buildbear.io/sticky-clea-edd665b2/tx/0xf9181fd5708541790c46054f2fec68e8e19158cce26d6f51606cdfc887ed6570
🟢 Yay!! 🎉🎉 Swapped 1 DAI to 0.998077 USDT
🟢 Balance after transaction:  0
🟢 DAI Balance after transaction:  97.999999999998786748
🟢 USDT Balance after transaction:  1.996154
🟢 Max DAI Estimate for UserOp:  73.815953056906692805
🟢 DAI charged for UserOp:  0
```
