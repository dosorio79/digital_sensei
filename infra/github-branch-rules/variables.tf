variable "github_owner" {
  description = "GitHub repository owner or organization."
  type        = string
  default     = "dosorio79"
}

variable "github_repository_name" {
  description = "GitHub repository name without owner."
  type        = string
  default     = "digital_sensei"
}

variable "production_branch" {
  description = "Production branch protected for Render deployments."
  type        = string
  default     = "master"
}

variable "development_branch" {
  description = "Shared integration branch created from production and protected."
  type        = string
  default     = "dev"
}

variable "required_status_check_contexts" {
  description = "GitHub status checks required before merging protected branches."
  type        = list(string)
  default     = ["Test"]
}

variable "master_required_approving_review_count" {
  description = "Approving reviews required before merging to master."
  type        = number
  default     = 1
}

variable "dev_required_approving_review_count" {
  description = "Approving reviews required before merging to dev. Zero keeps the PR flow without requiring an approval."
  type        = number
  default     = 0
}
