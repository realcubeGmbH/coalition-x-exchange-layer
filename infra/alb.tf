# =============================================================================
# APPLICATION LOAD BALANCER
# =============================================================================

resource "aws_lb" "main" {
  name               = "${var.project_name}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "prod"

  tags = {
    Name = "${var.project_name}-${var.environment}-alb"
  }
}

# =============================================================================
# TARGET GROUP
# =============================================================================

resource "aws_lb_target_group" "app" {
  name        = "${var.project_name}-${var.environment}-tg"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = local.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    interval            = 30
    path                = "/api/health"
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = {
    Name = "${var.project_name}-${var.environment}-tg"
  }

  depends_on = [aws_lb.main]
}

# =============================================================================
# ALB LISTENER (HTTP)
# =============================================================================
# When HTTPS is enabled, this redirects to HTTPS
# When HTTPS is disabled, this forwards to the target group

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = var.enable_https ? "redirect" : "forward"

    # Redirect to HTTPS if enabled
    dynamic "redirect" {
      for_each = var.enable_https ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }

    # Forward to target group if HTTPS is disabled
    target_group_arn = !var.enable_https ? aws_lb_target_group.app.arn : null
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-listener-http"
  }

  lifecycle {
    ignore_changes = [default_action[0].target_group_arn]
  }
}

# =============================================================================
# ALB LISTENER (HTTPS)
# =============================================================================
# Only created when HTTPS is enabled

resource "aws_lb_listener" "https" {
  count = var.enable_https ? 1 : 0

  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = var.ssl_policy
  certificate_arn   = local.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-listener-https"
  }

  depends_on = [aws_acm_certificate.main]
}
