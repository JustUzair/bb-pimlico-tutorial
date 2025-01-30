# Pimlico x BuildBear Tutorial

To set up the tutorial, clone this repository, run install the dependencies, and run `npm start`!

```bash
npm install
npm start
```

# Output for Swapping DAI to USDC on Uniswap V3 with Alto Bundler & Pimlico

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
-------- UserOp to Swap DAI to USDC on Uniswap V3 with Alto ---------
🟠Balance before transaction:  194.996633374957401338
🟠DAI Balance before transaction:  30000000194
🟠USDC Balance before transaction:  300.99521
====================================
🟢User operation included: https://explorer.buildbear.io/uzair/tx/0x24460661e2b44e6596758aef6e97fdbc9c57801504c196849e863c7c89febe33
🟢 Balance after transaction:  194.996344530955090602
🟢 DAI Balance after transaction:  30000000193
🟢 USDC Balance after transaction:  301.990336
Swapped 1 DAI to 0.9951260000000275 USDC
```
