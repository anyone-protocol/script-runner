# Requires:
# + Sepolia ETH funded admin account
# + vault policy: deploy-admin allowing this job to...
#       read vault: deploy-admin/DEPLOY_ADMIN_KEY
# + vault token - VAULT_DEPLOY_CONFIG_TOKEN: 
#       vault token create -display-name=generate-secrets-sepolia -ttl=7d -policy=generate-secrets-sepolia -renewable=false -type=batch
#       generate-secrets-sepolia policy to update vault values:
#           ator-token/sepolia/+/TOKEN_DEPLOYER_KEY
#           ator-token/sepolia/+/TOKEN_DEPLOYER_ADDRESS
#           registrator/sepolia/+/REGISTRATOR_DEPLOYER_KEY
#           registrator/sepolia/+/REGISTRATOR_DEPLOYER_ADDRESS
#           registrator/sepolia/+/REGISTRATOR_OPERATOR_ADDRESS
#           registrator/sepolia/+/REGISTRATOR_OPERATOR_KEY
#           facilitator/sepolia/+/FACILITATOR_DEPLOYER_KEY
#           facilitator/sepolia/+/FACILITATOR_DEPLOYER_ADDRESS
#           facilitator/sepolia/+/FACILITATOR_OPERATOR_ADDRESS
#           facilitator/sepolia/+/FACILITATOR_OPERATOR_KEY
#   
# Prepares deployment of:
# 1. ATOR token
# - create vault policies: ator-token-dev-sepolia ator-token-stage-sepolia ator-token-live-sepolia
# - create consul tokens and policies: ator-token-dev-sepolia ator-token-stage-sepolia ator-token-live-sepolia
#       write: ator-token/sepolia/live/address ator-token/sepolia/stage/address ator-token/sepolia/live/address
# - generate and store: ator-token/sepolia/dev/... ator-token/sepolia/stage/... ator-token/sepolia/live/...
#   vault:CONSUL_TOKEN - used by the token deploy job to set contract's address
#   vault:JSON_RPC - used to deploy the token
# 
# Scripted:
# * vault:TOKEN_DEPLOYER_KEY - key of the deployer account for the token
# * consul:deployer-address - address of the deployer account for the token
# * send Sepolia tokens from admin to the generated address
#
# ==== ready to run deploy scripts (deploy -> remove-limits + enable-trading) from ator-token/operations
#
# 2. Registrator contract
# - create vault policies: registrator-dev-sepolia registrator-stage-sepolia registrator-live-sepolia
# - create consul tokens and policies: registrator-dev-sepolia registrator-stage-sepolia registrator-live-sepolia
#       write: registrator/sepolia/live/address registrator/sepolia/stage/address registrator/sepolia/live/address
# - generate and store: registrator/sepolia/dev/... registrator/sepolia/stage/... registrator/sepolia/live/...
#   vault:CONSUL_TOKEN - used by registrator's deploy job to set the contract's address
#   vault:JSON_RPC - used to deploy the registrator
#
# Scripted:
# * vault:REGISTRATOR_OPERATOR_ADDRESS
# * vault:REGISTRATOR_OPERATOR_KEY
# * vault:REGISTRATOR_DEPLOYER_ADDRESS
# * vault:REGISTRATOR_DEPLOYER_KEY
# * send Sepolia tokens from admin to each of generated addresses
#
# ==== ready to run deploy script from registrator/operations
# 
# 3. Facilitator contract
# - create vault policies: facilitator-dev-sepolia facilitator-stage-sepolia facilitator-live-sepolia
# - create consul tokens and policies: facilitator-dev-sepolia facilitator-stage-sepolia facilitator-live-sepolia
#       write: facilitator/sepolia/live/address facilitator/sepolia/stage/address facilitator/sepolia/live/address
# - generate and store: facilitator/sepolia/dev/... facilitator/sepolia/stage/... facilitator/sepolia/live/...
#   vault:CONSUL_TOKEN - used by facilitator's deploy job to set the contract's address
#   vault:JSON_RPC - used to deploy the facilitator
#
# Scripted:
# * vault:FACILITATOR_OPERATOR_ADDRESS
# * vault:FACILITATOR_OPERATOR_KEY
# * vault:FACILITATOR_DEPLOYER_ADDRESS
# * vault:FACILITATOR_DEPLOYER_KEY
# * consul:deployer-address - address of the deployer account for the facilitator
# * send Sepolia tokens from admin to each of generated addresses
#
# ==== ready to run deploy script from facilitator/operations
# - send new ATOR tokens to new facilitator contracts (dev, stage, live)

job "generate-config" {
    datacenters = ["ator-fin"]
    type = "batch"

    reschedule {
        attempts = 0
    }

    task "generate-config-task" {
        driver = "docker"

        config {
            network_mode = "host"
            image = "ghcr.io/ator-development/script-runner:0.2.0"
            entrypoint = ["npx"]
            command = "hardhat"
            args = ["run", "--network", "sepolia", "scripts/generate-config.ts"]
        }

        vault {
            policies = ["deploy-admin"]
        }

        template {
            data = <<EOH
            {{with secret "kv/deploy-admin"}}
                DEPLOY_ADMIN_KEY="{{.Data.data.DEPLOY_ADMIN_KEY}}"
                VAULT_TOKEN="{{.Data.data.VAULT_DEPLOY_CONFIG_TOKEN}}"
                JSON_RPC="{{.Data.data.JSON_RPC}}"
                VAULT_URI="{{.Data.data.VAULT_URI}}"
            {{end}}
            EOH
            destination = "secrets/file.env"
            env         = true
        }

        env {
            IS_LIVE="false"
            CONSUL_IP="127.0.0.1"
            CONSUL_PORT="8500"
            NETWORK_NAME="sepolia"
            PHASE_NAME="dev"
        }

        restart {
            attempts = 0
            mode = "fail"
        }

        resources {
            cpu    = 4096
            memory = 4096
        }
    }
}

