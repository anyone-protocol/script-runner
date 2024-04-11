# Generate config
This script stores generated secrets in vault and funds created accounts.

## Prerequisites
 + Sepolia ETH funded admin account
 + vault policy: deploy-admin allowing this job to read vault: deploy-admin
 + vault token - VAULT_DEPLOY_CONFIG_TOKEN: 
       vault token create -display-name=generate-secrets-sepolia -ttl=7d -policy=generate-secrets-sepolia -renewable=false -type=batch
       generate-secrets-sepolia policy to 'update' vault values:
           ator-token/sepolia/dev|stage|live registrator/sepolia/dev|stage|live facilitator/sepolia/dev|stage|live

## Run the script
`generate-config.hcl`

## ATOR token
 
Scripted:
 * vault:TOKEN_DEPLOYER_KEY
 * vault:TOKEN_DEPLOYER_ADDRESS
 * vault:JSON_RPC
 * send Sepolia tokens from admin to the generated address

Manual:
 + create consul tokens and policies: ator-token-sepolia-dev|stage|live
      write: ator-token/sepolia/*/address
 + generate and store: ator-token/sepolia/dev|stage|live
      vault:CONSUL_TOKEN - used by the token deploy job to set contract's address
 + create vault policies: ator-token-sepolia-dev|stage|live

 + run deploy scripts (deploy -> remove-limits + enable-trading) from ator-token/operations

## Registrator contract

Scripted:
 * vault:REGISTRATOR_OPERATOR_ADDRESS
 * vault:REGISTRATOR_OPERATOR_KEY
 * vault:REGISTRATOR_DEPLOYER_ADDRESS
 * vault:REGISTRATOR_DEPLOYER_KEY
 * vault:JSON_RPC
 * send Sepolia tokens from admin to each of generated addresses

Manual:
 + create consul tokens and policies: registrator-sepolia-dev|stage|live
       write: registrator/sepolia/*/address
       read: ator-token/sepolia/*/address
 + generate and store: registrator/sepolia/dev|stage|live
   vault:CONSUL_TOKEN - used by registrator's deploy job to set the contract's address
 + create vault policies: registrator-sepolia-dev|stage|live

 + run deploy script from registrator/operations
 
## Facilitator contract

Scripted:
 * vault:FACILITATOR_OPERATOR_ADDRESS
 * vault:FACILITATOR_OPERATOR_KEY
 * vault:FACILITATOR_DEPLOYER_ADDRESS
 * vault:FACILITATOR_DEPLOYER_KEY
 * vault:JSON_RPC
 * send Sepolia tokens from admin to each of generated addresses

Manual: 
 + create consul tokens and policies: facilitator-sepolia-dev|stage|live
       write: facilitator/sepolia/*/address
       read: ator-token/sepolia/*/address
 + generate and store: facilitator/sepolia/dev|stage|live
   vault:CONSUL_TOKEN - used by facilitator's deploy job to set the contract's address
 + create vault policies: facilitator-sepolia-dev|stage|live

 + ready to run deploy scripts (deploy -> test-generate-accounts) from facilitator/operations

 - send new ATOR tokens to new facilitator contracts