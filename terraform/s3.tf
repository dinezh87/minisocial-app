resource "aws_s3_bucket" "media" {
  bucket = coalesce(var.media_bucket_name, "${local.name_prefix}-media")

  tags = merge(
    local.tags,
    {
      Name = "${local.name_prefix}-media"
    }
  )
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id

  versioning_configuration {
    status = "Enabled"
  }
}
