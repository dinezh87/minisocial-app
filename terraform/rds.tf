resource "aws_db_subnet_group" "auth" {
  count = var.rds_enabled ? 1 : 0

  name       = "${local.name_prefix}-auth-db-subnets"
  subnet_ids = module.vpc.private_subnets

  tags = merge(
    local.tags,
    {
      Name = "${local.name_prefix}-auth-db-subnets"
    }
  )
}

resource "aws_security_group" "auth_db" {
  count = var.rds_enabled ? 1 : 0

  name        = "${local.name_prefix}-auth-db-sg"
  description = "Allow PostgreSQL access from the VPC"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "PostgreSQL from within the VPC"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    local.tags,
    {
      Name = "${local.name_prefix}-auth-db-sg"
    }
  )
}

resource "aws_db_instance" "auth" {
  count = var.rds_enabled ? 1 : 0

  identifier = coalesce(var.rds_identifier, "${local.name_prefix}-auth-db")

  engine         = var.rds_engine
  engine_version = var.rds_engine_version
  instance_class = var.rds_instance_class

  allocated_storage     = var.rds_allocated_storage
  max_allocated_storage = var.rds_allocated_storage + 20
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.rds_db_name
  username = var.rds_username
  password = var.rds_password

  port                    = 5432
  db_subnet_group_name    = aws_db_subnet_group.auth[0].name
  vpc_security_group_ids  = [aws_security_group.auth_db[0].id]
  publicly_accessible     = var.rds_publicly_accessible
  multi_az                = var.rds_multi_az
  skip_final_snapshot     = var.rds_skip_final_snapshot
  deletion_protection     = !var.rds_skip_final_snapshot
  backup_retention_period = var.environment == "prod" ? 7 : 1

  tags = merge(
    local.tags,
    {
      Name = coalesce(var.rds_identifier, "${local.name_prefix}-auth-db")
    }
  )
}
