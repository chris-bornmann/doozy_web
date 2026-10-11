# doozy_web
Web client for Doozy.

# Install Claude...
...

# Install the Tailwind MCP server so Claude can see the browser.
claude mcp add playwright npx @playwright/mcp@latest
Open .claude/settings.local.json.  Set "allow" to "mcp__playwright".

# To Run
* npm run dev
* VITE_API_BASE_URL=http://100.104.51.111:8000 npm run dev --dd -- --host

# Deploying
Pushes to `main` are built and deployed to AWS (S3 + CloudFront) by
`.github/workflows/deploy.yml`. It can also be run by hand from the Actions tab.
The AWS infrastructure lives in [doozy_aws](https://github.com/chris-bornmann/doozy_aws).

One-time setup: add these repository variables (Settings → Secrets and variables →
Actions → Variables), using `terraform output` in `doozy_aws/envs/prod`:

| Variable | Terraform output |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | `frontend_deploy_role_arn` |
| `FRONTEND_BUCKET` | `frontend_bucket_name` |
| `FRONTEND_DISTRIBUTION_ID` | `frontend_distribution_id` |
| `VITE_API_BASE_URL` | URL of the backend API (optional for now; must be `https://`) |

Until `AWS_DEPLOY_ROLE_ARN` is set, the deploy job is skipped.
