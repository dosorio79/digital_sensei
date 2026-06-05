# GitHub Branch Rules Terraform

This Terraform root module manages GitHub branch setup only:

- Creates `dev` from `master` if it does not already exist.
- Protects `master`.
- Protects `dev`.
- Requires the GitHub Actions `Test` check before protected-branch merges.

Render deployment is intentionally managed by root `render.yaml`, not Terraform.

The GitHub Actions workflow validates this Terraform module, but it does not apply it. Applying from CI should wait until a remote Terraform backend is configured, otherwise state would be lost between workflow runs.

## Required Secret

Set this in the environment where Terraform runs:

```bash
export GITHUB_TOKEN=...
```

The token must have repository administration permission so the GitHub provider can create `dev` and manage branch protection rules. In GitHub Actions, use a PAT stored as `GH_TERRAFORM_TOKEN`; the default `GITHUB_TOKEN` is usually not enough for branch protection.

For local convenience, copy `.env.example` to `.env` and source it before running Terraform:

```bash
cp .env.example .env
$EDITOR .env
set -a
. ./.env
set +a
```

`.env` is ignored by git and must never be committed.

## Local Usage

```bash
cd infra/github-branch-rules
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

If `dev` already exists before the first apply, import it instead of letting Terraform create it:

```bash
terraform import github_branch.dev digital_sensei:dev
```

Do not commit `terraform.tfvars` or Terraform state files.
