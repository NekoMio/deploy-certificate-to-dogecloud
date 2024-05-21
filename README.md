# GitHub Action for Deploying SSL certificate to Upyun

Deploy SSL certificate to Upyun CDN or OSS.

# Usage

This action will deploy your PEM-formatted SSL certificate to Upyun. Since it uses Upyun's console API, you must use a subaccount (NOT your main account since it requires 2FA) as credential.

```yaml
jobs:
  deploy-to-upyun:
    name: Deploy certificate to Upyun
    runs-on: ubuntu-latest
    steps:
      - name: Check out
        uses: actions/checkout@v2
        with:
          # If you just commited and pushed your newly issued certificate to this repo in a previous job,
          # use `ref` to make sure checking out the newest commit in this job
          ref: ${{ github.ref }}
      - uses: NekoMio/deploy-certificate-to-dogecloud@main
        with:
          # accesskey
          accesskey: ${{ secrets.DOGECLOUD_ACCESSKEY }} # 又拍云账户用户名
          secretkey: ${{ secrets.DOGECLOUD_SECRETKEY }} # 又拍云账户密码

          # Specify PEM fullchain file
          fullchain-file: ${{ env.FILE_FULLCHAIN }}
          # Specify PEM private key file
          key-file: ${{ env.FILE_KEY }}

          # Deploy to CDN
          domains: |
            cdn1.example.com
            cdn2.example.com
            oss1.example.com
            oss2.example.com
```
