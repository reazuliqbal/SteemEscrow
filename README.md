# SteemEscrow
This is Steem Escrow GUI built on top of STEEM Blockchain using [Steem JS](https://github.com/steemit/steem-js/) and [STEEM and GOLOS Escrow Transactions GUI](https://github.com/MrXtar/steem-golos-escrow-gui) by [@xtar](https://steemit.com/@xtar) as reference.

## Why This?
You may ask if there is already one project exists why another. The answer is my project is fundamentally different form @xtar's one. In this project I refactored some of @xtar's code but my project is greared towards hosting of the escrow service by anyone. It can support API for agents lists, and also has a better UI IMHO. It also use latest Steem JS library and Bootstrap 3.

## What is the project about?
STEEM has a escrow service built into it's blockchain which is little known and very little talked about. While checking Steem JS API documentation I noticed API endpoints for Escrow and wanted to built something on it as hobby project. After bit of searching I found @xtar's project but that wasn't working. As the beauty of opensource project - I read through his codes and wanted to modify it to work and serve my need.

## How it works
At first a Steemit.com user need to visit https://codebull.github.io/SteemEscrow/ or any self-hosted version of this porject with respective agent list and create a escrow transaction using his/her Active private key. If the transaction creation is successful, there will be an URL for escrow control panel, which the sender needs to send to the receiver and the agent of the transaction for their approval.

If any of them does not approve the transaction, the escrow transaction will be canceled. If both of the receiver and agent approves, transaction will go through and within the transaction warranty period sender and receiver can release and return the fund to receiver or sender repectively. If any of the sender and receiver dispute the transaction then agent will decided who to send the fund.

By default it usage `testnet.steem.vc` not real steemit.com. To use real Steemit.com accounts please remove the following lines from the top of `js/app.js`.
```javascript
// STEEM cofig for test chain
steem.api.setOptions({ url: 'wss://testnet.steem.vc' });
steem.config.set('address_prefix', 'STX');
steem.config.set('chain_id', '79276aea5d4877d9a25892eaa01b0adf019d3e5cb12a97478df3298ccdd01673');
```

## Technology Stack
- HTML, CSS, JS
- jQuery (3.3.1)
- Bootstrap (3.3.7)
- Steem JS (0.7.1)

## How to contribute
Clone this repository and open the files in a code editor. JS can be edited from `src/js/app.js` and CSS can be edited from `/src/css/app.scss`.
#### Requirements:
- Node Js
- NPM
- Terminal
- Gulp
- BrowserSync

On the project root open up Terminal and write `npm install` to install dependencies. After installation write `gulp` to start BrowserSync live reload server and start editing on code editor.
