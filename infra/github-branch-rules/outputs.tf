output "protected_branches" {
  description = "GitHub branches managed by this Terraform configuration."
  value = [
    github_branch_protection.master.pattern,
    github_branch_protection.dev.pattern,
  ]
}
