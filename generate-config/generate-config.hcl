job "generate-config" {
    datacenters = ["ator-fin"]
    type = "batch"

    reschedule {
        attempts = 0
    }

    group "generate-config-group" {
        network {
            port http {
                host_network = "wireguard"
            }
        }

        task "generate-config-task" {
            driver = "docker"

            config {
                image = "ghcr.io/ator-development/script-runner:0.2.18"
                entrypoint = ["npx"]
                command = "hardhat"
                args = ["run", "--network", "sepolia", "generate-config/generate-config.ts"]
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
                VAULT_SKIP_VERIFY="true"
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
}

