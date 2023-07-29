#!/bin/bash

npm install

npm run deploy -w server

export $(grep -v '^#' .env | xargs)

PACKAGE_VERSION=$(node -p -e "require('./package.json').version")
echo '' >> .env
echo VITE_PACKAGE_VERSION=${PACKAGE_VERSION} >> .env
touch app/.env
cp .env app/.env
npm run build -w app

aws configure set preview.cloudfront true
aws s3 cp app/dist/ s3://${BUCKET_NAME} --recursive 
aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_DISTRIBUTION} --paths "/*" "/index.html" --no-cli-pager