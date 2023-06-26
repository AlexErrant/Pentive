export developmentAlphaKey=
export productionAlphaKey=
export cloudflareAccountId=
export developmentPlanetscaleDbUrl=
export productionPlanetscaleDbUrl=
# generate 32 bits of random data in base64, cut off new line character, add it to the clipboard
# openssl rand -base64 32 | head -c -1 | pbcopy
export developmentMediaTokenSecret=you+should+replace+this+with+a+real+base64+=
export productionMediaTokenSecret=you+should+replace+this+with+a+real+base64+=
export developmentHubSessionSecret=secret/you+can+run+the+command+which+kinda+=
export productionHubSessionSecret=secret/you+can+run+the+command+which+kinda+=
export developmentJwsSecret=looks+like+openssl+rand+base64+32+comma+but=
export productionJwsSecret=looks+like+openssl+rand+base64+32+comma+but=
export developmentCsrfSecret=with+spaces+and+hyphens+and+stuff+ZZZZZZZZZ=
export productionCsrfSecret=with+spaces+and+hyphens+and+stuff+ZZZZZZZZZ=
export developmentOauthStateSecret=also+this+is+the+same+32+bits+of+base64+joy=
export productionOauthStateSecret=also+this+is+the+same+32+bits+of+base64+joy=
export developmentOauthCodeVerifierSecret=also+this+is+the+same+32+bits+of+base64+joy=
export productionOauthCodeVerifierSecret=also+this+is+the+same+32+bits+of+base64+joy=
export developmentHubInfoSecret=also+this+is+the+same+32+bits+of+base64+joy=
export productionHubInfoSecret=also+this+is+the+same+32+bits+of+base64+joy=
export developmentDiscordId=create at https://discord.com/developers/applications
export productionDiscordId=Redirects (callbacks) are https://pentive.localhost:3014/api/auth/callback/discord or https://pentive.com/api/auth/callback/discord
export developmentDiscordSecret=
export productionDiscordSecret=
export developmentGithubId=create at https://github.com/settings/developers
export productionGithubId=Authorization callback URL is https://pentive.localhost:3014/api/auth/callback/github or https://pentive.com/api/auth/callback/github
export developmentGithubSecret=
export productionGithubSecret=
export developmentAppOrigin=https://app.pentive.localhost:3013
export productionAppOrigin=https://app.pentive.com
export developmentHubOrigin=https://pentive.localhost:3014
export productionHubOrigin=https://pentive.com
# If you add any `VITE_PRODUCTION_*`, also update `cicd.yml`
export VITE_DEVELOPMENT_HUB_DOMAIN=pentive.localhost
export VITE_PRODUCTION_HUB_DOMAIN=hub.yourusernamehere.workers.dev
export VITE_DEVELOPMENT_HUB_ORIGIN=https://pentive.localhost:3014
export VITE_PRODUCTION_HUB_ORIGIN=https://pentive.com
export VITE_DEVELOPMENT_CWA_URL=https://cwa.pentive.localhost:3017/
export VITE_PRODUCTION_CWA_URL=https://cwa.yourusernamehere.workers.dev/
export VITE_DEVELOPMENT_AUGC_URL=https://user-generated-content-pentive.localhost:3019/
export VITE_PRODUCTION_AUGC_URL=https://user-generated-content-pentive.yourusernamehere.workers.dev/
export VITE_DEVELOPMENT_APP_ORIGIN=https://app.pentive.localhost:3013
export VITE_PRODUCTION_APP_ORIGIN=https://app.yourusernamehere.workers.dev
export VITE_DEVELOPMENT_HUB_UGC_ORIGIN=https://hub-user-generated-content-pentive.localhost:3016
export VITE_PRODUCTION_HUB_UGC_ORIGIN=https://hub-user-generated-content.yourusernamehere.workers.dev
export VITE_DEVELOPMENT_APP_UGC_ORIGIN=https://app-user-generated-content-pentive.localhost:3015
export VITE_PRODUCTION_APP_UGC_ORIGIN=https://app-user-generated-content.yourusernamehere.workers.dev
export VITE_DEVELOPMENT_PEER_HOST=peer.pentive.localhost
export VITE_DEVELOPMENT_PEER_PORT="3018"
export VITE_PRODUCTION_PEER_HOST="0.peerjs.com"
export VITE_PRODUCTION_PEER_PORT="443"
