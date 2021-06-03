# StorX Contracts

This repository contains smart contracts for StorX Token and its Proxy Contract. The Proxy contract has been inspired from USDC contract on ethereum blockhain.

## Tokenomics

- Name: STORX
- Symbol: SRX
- Decimals: 18
- Total Supply: 500 Million

## Deployments

- StorX Token Implementation - [xdcdc34e983e8558651ebb1fd3d2f2cf303bf8fd00a](https://xdc.network/addr/xdcdc34e983e8558651ebb1fd3d2f2cf303bf8fd00a)
- StorX Token Proxy - [xdc5d5f074837f5d4618b3916ba74de1bf9662a3fed](https://xdc.network/addr/xdc5d5f074837f5d4618b3916ba74de1bf9662a3fed)

## Brief on Proxy

All the function calls are made to proxy contract which delegate calls to the implementation. The context i.e. address where all data regarding the state of the contract is stored will be on Proxy contract and not on implementation contract.

This empowers us to change the contract functionality at a later stage after deployment. Storage collisions have been considered and the contract follows [EIP-1967: Standard Proxy Storage Slots](https://eips.ethereum.org/EIPS/eip-1967) for the same, so explorers can identify that the contract is a proxy.

## Testing

- Test Token Via Proxy `npm run test-proxy`
- Test Token Directly `npm run test-token`
- Test Both `npm run test-all`

## Audit

AN internal audit has been done of the smarrt contract and its report can be found [here](/audit/report/StorXAudit.pdf)
