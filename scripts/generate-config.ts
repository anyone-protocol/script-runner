import 'dotenv/config'
import '@nomiclabs/hardhat-ethers'
import { ethers } from 'hardhat'

const isLive = (process.env.IS_LIVE === 'true')
const networkName = process.env.NETWORK_NAME || 'NETWORK_NAME-not-set'
const phaseName = process.env.PHASE_NAME || 'PHASE_NAME-not-set'

const vault = require('node-vault')({
    apiVersion: 'v1',
    endpoint: process.env.VAULT_URI || 'http://127.0.0.1:8200',
    token: process.env.VAULT_TOKEN || 'invalid-token'
})

const provider = new ethers.providers.JsonRpcProvider(process.env.JSON_RPC || 'JSON_RPC-not-set')

function makePath(root: string, network: string, phase: string) {
    return `kv/${root}/${network}/${phase}`
}

async function generateKeyPair(contractName: string, secretPrefix: string) {
    const wallet = new ethers.Wallet(ethers.Wallet.createRandom(), provider)

    const vaultKeyPath = `${makePath(contractName, networkName, phaseName)}/${secretPrefix}_KEY`
    const vaultAddressPath = `${makePath(contractName, networkName, phaseName)}/${secretPrefix}_ADDRESS`
    
    if(isLive) {
        await vault.write(vaultKeyPath, { value: wallet.privateKey })
        console.log(`Stored ${vaultKeyPath}`)
        await vault.write(vaultAddressPath, { value: wallet.address })
        console.log(`Stored ${vaultAddressPath}`)
    } else console.log(`Not live. Skipping set up of\n VAULT:${vaultKeyPath} => ${wallet.privateKey}\n VAULT:${vaultAddressPath} => ${wallet.address}`)

    return wallet.address
}

async function main() {
    console.log(`Starting with LIVE: ${isLive} in:${phaseName} network:${networkName}`)
    if (isLive) {
        console.log('Waiting for 30s before starting live operations!')
        await new Promise(r => setTimeout(r, 30000));
    }
    
    const atorTokenDeployerAddress = await generateKeyPair('ator-token', 'TOKEN_DEPLOYER')

    const registratorDeployerAddress = await generateKeyPair('registrator', 'REGISTRATOR_DEPLOYER')
    const registratorOperatorAddress = await generateKeyPair('registrator', 'REGISTRATOR_OPERATOR')

    const facilitatorDeployerAddress = await generateKeyPair('facilitator', 'FACILITATOR_DEPLOYER')
    const facilitatorOperatorAddress = await generateKeyPair('facilitator', 'FACILITATOR_OPERATOR')

    const adminWallet = new ethers.Wallet(process.env.DEPLOY_ADMIN_KEY || 'DEPLOY_ADMIN_KEY-not-set', provider)
    console.log(`Loaded deploy admin wallet ${adminWallet.address}`)

    if (isLive) {
        await adminWallet.sendTransaction({ to: atorTokenDeployerAddress, value: ethers.utils.parseEther('0.01') })
        await adminWallet.sendTransaction({ to: registratorDeployerAddress, value: ethers.utils.parseEther('0.01') })
        await adminWallet.sendTransaction({ to: registratorOperatorAddress, value: ethers.utils.parseEther('0.1') })
        await adminWallet.sendTransaction({ to: facilitatorDeployerAddress, value: ethers.utils.parseEther('0.01') })
        await adminWallet.sendTransaction({ to: facilitatorOperatorAddress, value: ethers.utils.parseEther('0.1') })
        console.log(`Send initial funding coins to:\n ${atorTokenDeployerAddress}\n ${registratorDeployerAddress}\n ${registratorOperatorAddress}\n ${facilitatorDeployerAddress}\n ${facilitatorOperatorAddress}`)
    } else console.log(`Skipping sending coins to:\n ${atorTokenDeployerAddress}\n ${registratorDeployerAddress}\n ${registratorOperatorAddress}\n ${facilitatorDeployerAddress}\n ${facilitatorOperatorAddress}`)

    console.log('DONE')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
