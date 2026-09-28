#!/bin/sh
set -eu

: "${S3_CHAVE_DE_ACESSO:?defina S3_CHAVE_DE_ACESSO}"
: "${S3_SEGREDO:?defina S3_SEGREDO}"

cat > /tmp/s3.json <<-EOF
	{
	  "identities": [
	    {
	      "name": "cdd",
	      "credentials": [
	        { "accessKey": "${S3_CHAVE_DE_ACESSO}", "secretKey": "${S3_SEGREDO}" }
	      ],
	      "actions": ["Admin", "Read", "Write"]
	    }
	  ]
	}
EOF

exec weed server -dir=/dados -s3 -ip=storage -s3.config=/tmp/s3.json -s3.port=9000
