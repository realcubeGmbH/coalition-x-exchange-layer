# =============================================================================
# ROUTE53 DNS RECORDS
# =============================================================================
# Points domain name to the Application Load Balancer

# Get the Route53 hosted zone
data "aws_route53_zone" "domain" {
  count = var.enable_https && var.route53_zone_id != null ? 1 : 0

  zone_id = var.route53_zone_id
}

# Create A record pointing to ALB
resource "aws_route53_record" "app" {
  count = var.enable_https && var.route53_zone_id != null ? 1 : 0

  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
