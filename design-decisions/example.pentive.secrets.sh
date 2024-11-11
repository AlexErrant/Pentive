export developmentAlphaKey=
export productionAlphaKey=
export cloudflareAccountId=
export developmentTursoDbUrl=http://127.0.0.1:3011
export testTursoDbUrl=http://127.0.0.1:3041
export developmentTursoAuthToken='optional if running locally'
export productionTursoDbUrl=
export productionTursoAuthToken=

# the following secrets may be generated as follows:
#     openssl rand -base64 32 | head -c -1 | pbcopy
# this generates 32 bits of random data in base64, cuts off the new line character, and adds it to the clipboard
export developmentMediaTokenSecret=
export productionMediaTokenSecret=
export developmentHubSessionSecret=
export productionHubSessionSecret=
export developmentCsrfSecret=
export productionCsrfSecret=
export developmentOauthStateSecret=
export productionOauthStateSecret=
export developmentOauthCodeVerifierSecret=
export productionOauthCodeVerifierSecret=
export developmentHubInfoSecret=
export productionHubInfoSecret=

# create at https://discord.com/developers/applications
# Redirects (callbacks) are https://pentive.localhost:3014/api/auth/callback/discord or https://pentive.com/api/auth/callback/discord
export developmentDiscordId=
export productionDiscordId=
export developmentDiscordSecret=
export productionDiscordSecret=

# create at https://github.com/settings/developers
# Authorization callback URL is https://pentive.localhost:3014/api/auth/callback/github or https://pentive.com/api/auth/callback/github
export developmentGithubId=
export productionGithubId=
export developmentGithubSecret=
export productionGithubSecret=

# cSpell:disable
# generate via:
#     openssl ecparam -name secp521r1 -genkey -noout -out private.ec.key
#     openssl pkcs8 -topk8 -nocrypt -in private.ec.key -out private.pem
#     openssl ec -in private.pem -pubout -out public.pem
# use public.pem and private.pem
# cSpell:enable
export developmentPeerSyncPublicKey="-----BEGIN PUBLIC KEY-----
foo
-----END PUBLIC KEY-----"
export developmentPeerSyncPrivateKey="-----BEGIN PRIVATE KEY-----
bar
-----END PRIVATE KEY-----"
export productionPeerSyncPublicKey="-----BEGIN PUBLIC KEY-----
biz
-----END PUBLIC KEY-----"
export productionPeerSyncPrivateKey="-----BEGIN PRIVATE KEY-----
baz
-----END PRIVATE KEY-----"

export developmentAppOrigin=https://app.pentive.localhost:3013
export developmentHubOrigin=https://pentive.localhost:3014
export testAppOrigin=https://app.pentive.localhost:3043
export testHubOrigin=https://pentive.localhost:3044

# If you add any `VITE_PRODUCTION_*` or edit the below, also update `cicd.yml`
export productionAppOrigin=https://app.pentive.com
export productionHubOrigin=https://pentive.com
export VITE_DEVELOPMENT_AG_GRID_LICENSE=
export VITE_PRODUCTION_AG_GRID_LICENSE=
export VITE_DEVELOPMENT_HUB_DOMAIN=pentive.localhost
export VITE_PRODUCTION_HUB_DOMAIN=hub.yourusernamehere.workers.dev
export VITE_DEVELOPMENT_HUB_ORIGIN=https://pentive.localhost:3014
export VITE_TEST_HUB_ORIGIN=https://pentive.localhost:3044
export VITE_PRODUCTION_HUB_ORIGIN=https://pentive.com
export VITE_DEVELOPMENT_CWA_URL=https://cwa.pentive.localhost:3017/
export VITE_TEST_CWA_URL=https://cwa.pentive.localhost:3047/
export VITE_PRODUCTION_CWA_URL=https://cwa.yourusernamehere.workers.dev/
export VITE_DEVELOPMENT_AUGC_URL=https://user-generated-content-pentive.localhost:3019/
export VITE_TEST_AUGC_URL=https://user-generated-content-pentive.localhost:3049/
export VITE_PRODUCTION_AUGC_URL=https://user-generated-content-pentive.yourusernamehere.workers.dev/
export VITE_DEVELOPMENT_APP_ORIGIN=https://app.pentive.localhost:3013
export VITE_TEST_APP_ORIGIN=https://app.pentive.localhost:3043
export VITE_PRODUCTION_APP_ORIGIN=https://app.yourusernamehere.workers.dev
export VITE_DEVELOPMENT_HUB_UGC_ORIGIN=https://hub-user-generated-content-pentive.localhost:3016
export VITE_TEST_HUB_UGC_ORIGIN=https://hub-user-generated-content-pentive.localhost:3046
export VITE_PRODUCTION_HUB_UGC_ORIGIN=https://hub-user-generated-content.yourusernamehere.workers.dev
export VITE_DEVELOPMENT_APP_UGC_ORIGIN=https://app-user-generated-content-pentive.localhost:3015
export VITE_TEST_APP_UGC_ORIGIN=https://app-user-generated-content-pentive.localhost:3045
export VITE_PRODUCTION_APP_UGC_ORIGIN=https://app-user-generated-content.yourusernamehere.workers.dev
export VITE_DEVELOPMENT_PEER_HOST=peer.pentive.localhost
export VITE_DEVELOPMENT_PEER_PORT="3018"
export VITE_TEST_PEER_PORT="3048"
export VITE_PRODUCTION_PEER_HOST="0.peerjs.com"
export VITE_PRODUCTION_PEER_PORT="443"
