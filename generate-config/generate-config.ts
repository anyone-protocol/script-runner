import 'dotenv/config'
import '@nomiclabs/hardhat-ethers'
import { ethers } from 'hardhat'

const isLive = (process.env.IS_LIVE === 'true')
const networkName = process.env.NETWORK_NAME || 'NETWORK_NAME-not-set'
const phaseName = process.env.PHASE_NAME || 'PHASE_NAME-not-set'

const vault = require('node-vault')({
    apiVersion: 'v1',
    pathPrefix: '/kv/data',
    endpoint: process.env.VAULT_URI || 'http://127.0.0.1:8200',
    token: process.env.VAULT_TOKEN || 'invalid-token'
})

const provider = new ethers.providers.JsonRpcProvider(process.env.JSON_RPC || 'JSON_RPC-not-set')
const adminWallet = new ethers.Wallet(process.env.DEPLOY_ADMIN_KEY || 'DEPLOY_ADMIN_KEY-not-set', provider)

function makeVaultPath(root: string, network: string, phase: string) {
    return `${root}/${network}/${phase}`
}

async function generateDeployer(contractName: string, secretPrefix: string) {
    let wallet = new ethers.Wallet(ethers.Wallet.createRandom(), provider)

    let vaultPath = makeVaultPath(contractName, networkName, phaseName)
    let keySecret = `${secretPrefix}_DEPLOYER_KEY`
    let addressSecret = `${secretPrefix}_DEPLOYER_ADDRESS`
    if(isLive) {
        let data = { "data": { [keySecret]: wallet.privateKey, [addressSecret]: wallet.address } }
        console.log(`${vaultPath} = ${JSON.stringify(data)}`)
        try {
            await vault.write(vaultPath, data)
            console.log(`Stored ${vaultPath}`)
        } catch (e) {
            // @ts-ignore
            if (e.response != undefined) {
                // @ts-ignore
                console.error(`Requesting POST write to: ${vaultPath} \n${e.response.statusCode} => ${e.response.body}`)
            }
        }
    } else console.log(`Not live. Skipping ${vaultPath}`)

    return wallet.address
}

async function generateDeployerAndOperator(contractName: string, secretPrefix: string) {
    let deployer = new ethers.Wallet(ethers.Wallet.createRandom(), provider)
    let operator = new ethers.Wallet(ethers.Wallet.createRandom(), provider)

    let vaultPath = makeVaultPath(contractName, networkName, phaseName)
    let deployerKeySecret = `${secretPrefix}_DEPLOYER_KEY`
    let deployerAddressSecret = `${secretPrefix}_DEPLOYER_ADDRESS`
    let operatorKeySecret = `${secretPrefix}_OPERATOR_KEY`
    let operatorAddressSecret = `${secretPrefix}_OPERATOR_ADDRESS`
    if(isLive) {
        let data = { "data": { 
            [deployerKeySecret]: deployer.privateKey, [deployerAddressSecret]: deployer.address, 
            [operatorKeySecret]: operator.privateKey, [operatorAddressSecret]: operator.address 
        } }
        console.log(`${vaultPath} = ${JSON.stringify(data)}`)
        try {
            await vault.write(vaultPath, data)
            console.log(`Stored ${vaultPath}`)
        } catch (e) {
            // @ts-ignore
            if (e.response != undefined) {
                // @ts-ignore
                console.error(`Requesting POST write to: ${vaultPath} \n${e.response.statusCode} => ${JSON.stringify(e.response.body)}`)
            }
        }
    } else console.log(`Not live. Skipping ${vaultPath}`)

    return [deployer.address, operator.address]
}

async function fund(address: string, amount: string) {
    let tx = await adminWallet.sendTransaction({ to: address, value: ethers.utils.parseEther(amount)})
    let rcpt = await tx.wait()
    console.log(`Address: ${address} Amount: ${amount}\nFund tx: ${tx.hash}\nFund gas: ${rcpt.gasUsed}\n`)       
}

async function main() {
    console.log(`Starting with LIVE:${isLive} in:${phaseName} network:${networkName}`)
    if (isLive) {
        console.log('Waiting for 30s before starting live operations!')
        await new Promise(r => setTimeout(r, 30000));
    }
    
    let atorTokenDeployerAddress = await generateDeployer('ator-token', 'TOKEN')
    let [registratorDeployerAddress, registratorOperatorAddress] = await generateDeployerAndOperator('registrator', 'REGISTRATOR')
    let [facilitatorDeployerAddress, facilitatorOperatorAddress] = await generateDeployerAndOperator('facilitator', 'FACILITATOR')

    if (isLive) {
        fund(atorTokenDeployerAddress, '0.01')
        fund(registratorDeployerAddress, '0.01')
        fund(registratorOperatorAddress, '0.1')
        fund(facilitatorDeployerAddress, '0.01')
        fund(facilitatorOperatorAddress, '0.1')
    } else console.log(`Skipping sending coins to:\n ${atorTokenDeployerAddress}\n ${registratorDeployerAddress}\n ${registratorOperatorAddress}\n ${facilitatorDeployerAddress}\n ${facilitatorOperatorAddress}`)

    console.log('DONE')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
