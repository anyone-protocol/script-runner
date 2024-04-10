import 'dotenv/config'
import '@nomiclabs/hardhat-ethers'
import { ethers } from 'hardhat'
import Consul from 'consul'

const isLive = (process.env.IS_LIVE === 'true')
const networkName = process.env.NETWORK_NAME || 'NETWORK_NAME-not-set'
const phaseName = process.env.PHASE_NAME || 'PHASE_NAME-not-set'

const vault = require('node-vault')({
    apiVersion: 'v1',
    endpoint: process.env.VAULT_URI || 'http://127.0.0.1:8200',
    token: process.env.VAULT_TOKEN || 'invalid-token'
})

const consulHttpToken = process.env.CONSUL_HTTP_TOKEN || 'CONSUL_HTTP_TOKEN-not-set'
console.log(`Connecting to Consul at ${process.env.CONSUL_IP}:${process.env.CONSUL_PORT}...`)
const consul = new Consul({ host: process.env.CONSUL_IP, port: process.env.CONSUL_PORT })

const provider = new ethers.providers.JsonRpcProvider(process.env.JSON_RPC || 'JSON_RPC-not-set')

function makePath(root: string, network: string, phase: string) {
    return `${root}/${network}/${phase}`
}

function makeConsulKey(root: string, network: string, phase: string, name: string) {
    return `${makePath(root, network, phase)}/${name}`
}

async function generateDeployer(contractName: string, deployerKeySecretName: string) {
    const wallet = new ethers.Wallet(ethers.Wallet.createRandom(), provider)

    const vaultKeyPath = `${makePath(contractName, networkName, phaseName)}/${deployerKeySecretName}`
    const consulKeyPath = makeConsulKey(contractName, networkName, phaseName, 'deployer-address')
    if(isLive) {
        await vault.write(vaultKeyPath, { value: wallet.privateKey })
        await consul.kv.set({ token: consulHttpToken, key: consulKeyPath, value: wallet.address });
    } else console.log(`Not live. Skipping set up of\n VAULT:${vaultKeyPath} => ${wallet.privateKey}\n CONSUL:${consulKeyPath} => ${wallet.address}`)
}

async function generateOperator(contractName: string, operatorKeySecretName: string, operatorAddressSecretName: string) {
    const wallet = new ethers.Wallet(ethers.Wallet.createRandom(), provider)
    const vaultKeyPath = `${makePath(contractName, networkName, phaseName)}/${operatorKeySecretName}`
    const vaultAddressPath = `${makePath(contractName, networkName, phaseName)}/${operatorAddressSecretName}`
    if(isLive) {
        await vault.write(vaultKeyPath, { value: wallet.privateKey })
        await vault.write(vaultAddressPath, { value: wallet.address })
    } else console.log(`Not live. Skipping set up of\n VAULT:${vaultKeyPath} => ${wallet.privateKey}\n VAULT:${vaultAddressPath} => ${wallet.address}`)
}

async function main() {
    console.log(`Starting with LIVE: ${isLive}`)
    if (!isLive) {
        console.log('Waiting for 30s before starting live operations!')
        await new Promise(r => setTimeout(r, 30000));
    }

    const deployAdminKey = process.env.DEPLOY_ADMIN_KEY || 'DEPLOY_ADMIN_KEY-not-set'
    
    const atorTokenDeployerAddress = await generateDeployer('ator-token', 'TOKEN_DEPLOYER_KEY')

    const registratorDeployerAddress = await generateDeployer('registrator', 'REGISTRATOR_DEPLOYER_KEY')
    const registratorOperatorAddress = await generateOperator('registrator', 'REGISTRATOR_OPERATOR_KEY', 'REGISTRATOR_OPERATOR_ADDRESS')

    const facilitatorDeployerAddress = await generateDeployer('facilitator', 'FACILITATOR_DEPLOYER_KEY')
    const facilitatorOperatorAddress = await generateOperator('facilitator', 'FACILITATOR_OPERATOR_KEY', 'FACILITATOR_OPERATOR_ADDRESS')


}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
