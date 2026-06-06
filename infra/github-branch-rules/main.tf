terraform {
  required_version = ">= 1.6.0"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

provider "github" {
  owner = var.github_owner
}

data "github_repository" "this" {
  full_name = "${var.github_owner}/${var.github_repository_name}"
}

resource "github_branch" "dev" {
  repository    = data.github_repository.this.name
  branch        = var.development_branch
  source_branch = var.production_branch
}

resource "github_branch_protection" "master" {
  repository_id                   = data.github_repository.this.node_id
  pattern                         = var.production_branch
  enforce_admins                  = true
  allows_deletions                = false
  allows_force_pushes             = false
  require_signed_commits          = false
  required_linear_history         = true
  require_conversation_resolution = true

  required_status_checks {
    strict   = true
    contexts = var.required_status_check_contexts
  }

  required_pull_request_reviews {
    dismiss_stale_reviews           = true
    require_code_owner_reviews      = false
    require_last_push_approval      = false
    required_approving_review_count = var.master_required_approving_review_count
  }
}

resource "github_branch_protection" "dev" {
  repository_id                   = data.github_repository.this.node_id
  pattern                         = github_branch.dev.branch
  enforce_admins                  = false
  allows_deletions                = false
  allows_force_pushes             = false
  require_signed_commits          = false
  required_linear_history         = false
  require_conversation_resolution = true

  required_status_checks {
    strict   = true
    contexts = var.required_status_check_contexts
  }

  required_pull_request_reviews {
    dismiss_stale_reviews           = true
    require_code_owner_reviews      = false
    require_last_push_approval      = false
    required_approving_review_count = var.dev_required_approving_review_count
  }
}
