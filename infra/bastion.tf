# =============================================================================
# BASTION HOST (Optional)
# =============================================================================
# Lightweight EC2 instance in a public subnet for SSH-tunneled DB access.
# Enable via: create_bastion = true  +  bastion_authorized_keys = ["ssh-ed25519 ..."]

data "aws_ami" "amazon_linux" {
  count       = var.create_bastion ? 1 : 0
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-arm64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_key_pair" "bastion" {
  count      = var.create_bastion ? length(var.bastion_authorized_keys) > 0 ? 1 : 0 : 0
  key_name   = "${var.project_name}-${var.environment}-bastion-key"
  public_key = var.bastion_authorized_keys[0]

  tags = {
    Name = "${var.project_name}-${var.environment}-bastion-key"
  }
}

resource "aws_instance" "bastion" {
  count = var.create_bastion ? 1 : 0

  ami                    = data.aws_ami.amazon_linux[0].id
  instance_type          = "t4g.nano"
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.bastion[0].id]
  key_name               = length(var.bastion_authorized_keys) > 0 ? aws_key_pair.bastion[0].key_name : null

  associate_public_ip_address = true

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-bastion"
  }
}
