#!/bin/sh
set -eu

: "${S3_ENDPOINT:?defina S3_ENDPOINT}"
: "${S3_BUCKET:?defina S3_BUCKET}"

if aws --endpoint-url "$S3_ENDPOINT" s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null; then
	echo "bucket $S3_BUCKET já existe"
	exit 0
fi

aws --endpoint-url "$S3_ENDPOINT" s3 mb "s3://$S3_BUCKET"
