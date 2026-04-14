# =============================================================================
# RDS POSTGRESQL DATABASE
# =============================================================================

# =============================================================================
# DATABASE SUBNET GROUP
# =============================================================================

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = aws_subnet.database[*].id

  tags = {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  }
}

# =============================================================================
# DATABASE PASSWORD
# =============================================================================

resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name_prefix             = "${var.project_name}-${var.environment}-db-credentials-"
  description             = "Database credentials for ${var.project_name}"
  recovery_window_in_days = var.environment == "prod" ? 7 : 0

  tags = {
    Name = "${var.project_name}-${var.environment}-db-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db_password.result
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = var.db_name
  })
}

# Full DATABASE_URL secret for Prisma
resource "aws_secretsmanager_secret" "database_url" {
  name_prefix             = "${var.project_name}-${var.environment}-database-url-"
  description             = "Full DATABASE_URL for Prisma"
  recovery_window_in_days = var.environment == "prod" ? 7 : 0

  tags = {
    Name = "${var.project_name}-${var.environment}-database-url"
  }
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/${var.db_name}?schema=public"
}

# =============================================================================
# JWT SECRETS
# =============================================================================

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "jwt_refresh_secret" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name_prefix             = "${var.project_name}-${var.environment}-jwt-secret-"
  description             = "JWT signing secret"
  recovery_window_in_days = var.environment == "prod" ? 7 : 0

  tags = {
    Name = "${var.project_name}-${var.environment}-jwt-secret"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

resource "aws_secretsmanager_secret" "jwt_refresh_secret" {
  name_prefix             = "${var.project_name}-${var.environment}-jwt-refresh-secret-"
  description             = "JWT refresh token secret"
  recovery_window_in_days = var.environment == "prod" ? 7 : 0

  tags = {
    Name = "${var.project_name}-${var.environment}-jwt-refresh-secret"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_refresh_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_refresh_secret.id
  secret_string = random_password.jwt_refresh_secret.result
}

# =============================================================================
# RDS POSTGRESQL INSTANCE
# =============================================================================

resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-${var.environment}-db"

  engine         = "postgres"
  engine_version = "16"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage * 2
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result
  port     = 5432

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  publicly_accessible    = false

  backup_retention_period    = var.environment == "prod" ? 7 : 1
  backup_window              = "03:00-04:00"
  maintenance_window         = "Sun:04:00-Sun:05:00"
  auto_minor_version_upgrade = true

  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.project_name}-${var.environment}-final-${formatdate("YYYY-MM-DD", timestamp())}" : null
  deletion_protection       = var.environment == "prod"

  performance_insights_enabled = var.environment == "prod"
  monitoring_interval          = var.environment == "prod" ? 60 : 0

  parameter_group_name = aws_db_parameter_group.main.name

  tags = {
    Name = "${var.project_name}-${var.environment}-database"
  }

  depends_on = [
    aws_db_subnet_group.main,
    aws_security_group.rds
  ]
}

# =============================================================================
# DATABASE PARAMETER GROUP
# =============================================================================

resource "aws_db_parameter_group" "main" {
  family = "postgres16"
  name   = "${var.project_name}-${var.environment}-db-params"

  parameter {
    name         = "shared_preload_libraries"
    value        = "pg_stat_statements"
    apply_method = "pending-reboot"
  }

  parameter {
    name  = "log_statement"
    value = var.environment == "prod" ? "ddl" : "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-db-params"
  }
}
