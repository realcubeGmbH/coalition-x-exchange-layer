# =============================================================================
# ECS MIGRATION TASK - Run Prisma Migrations
# =============================================================================

resource "aws_ecs_task_definition" "migration" {
  family                   = "${var.project_name}-${var.environment}-migration"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "migration"
      image     = "${aws_ecr_repository.main.repository_url}:latest"
      essential = true

      # Run Prisma migrations
      command = ["npx", "prisma", "migrate", "deploy"]

      environment = [
        { name = "NODE_ENV", value = "production" }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_secretsmanager_secret.database_url.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.migration_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "migration"
        }
      }
    }
  ])

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  tags = {
    Name    = "${var.project_name}-${var.environment}-migration-task"
    Purpose = "Database Migration"
  }
}

resource "aws_cloudwatch_log_group" "migration_logs" {
  name              = "/ecs/${var.project_name}-${var.environment}-migration"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-${var.environment}-migration-logs"
  }
}
