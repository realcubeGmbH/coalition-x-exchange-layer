# =============================================================================
# AWS CERTIFICATE MANAGER (ACM) - SSL/TLS CERTIFICATES
# =============================================================================
# Provides free SSL/TLS certificates for HTTPS

# =============================================================================
# ACM CERTIFICATE
# =============================================================================

resource "aws_acm_certificate" "main" {
  count = var.enable_https && var.certificate_arn == null ? 1 : 0

  domain_name               = var.domain_name
  subject_alternative_names = var.certificate_subject_alternative_names
  validation_method         = var.certificate_validation_method

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-cert"
    Environment = var.environment
  }
}

# =============================================================================
# DNS VALIDATION (Route53)
# =============================================================================
# Automatically validates the certificate if using Route53

data "aws_route53_zone" "main" {
  count = var.enable_https && var.certificate_validation_method == "DNS" && var.route53_zone_id != null ? 1 : 0

  zone_id = var.route53_zone_id
}

resource "aws_route53_record" "cert_validation" {
  for_each = var.enable_https && var.certificate_validation_method == "DNS" && var.route53_zone_id != null ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main[0].zone_id
}

resource "aws_acm_certificate_validation" "main" {
  count = var.enable_https && var.certificate_validation_method == "DNS" && var.route53_zone_id != null ? 1 : 0

  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]

  timeouts {
    create = "10m"
  }
}

# =============================================================================
# LOCAL VARIABLE - Certificate ARN
# =============================================================================
# Use existing certificate ARN or newly created one

locals {
  certificate_arn = var.enable_https ? (
    var.certificate_arn != null ? var.certificate_arn : aws_acm_certificate.main[0].arn
  ) : null
}
