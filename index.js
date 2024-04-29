var axios = require("axios");
var crypto = require("crypto");
var querystring = require("querystring");
var core = require("@actions/core");
var fs = require("fs")
// import * as core from "@actions/core";

const input = {
  accessKey: core.getInput("accesskey"),
  secretKey: core.getInput("secretkey"),
  fullchainFile: core.getInput("fullchain-file"),
  keyFile: core.getInput("key-file"),
  domains: core.getInput("domains"),
};

/**
 * 调用多吉云API
 *
 * @param  {string}     apiPath     调用的 API 接口地址，包含 URL 请求参数 QueryString，例如：/console/vfetch/add.json?url=xxx&a=1&b=2
 * @param  {object}     data        POST 的数据，对象，例如 {a: 1, b: 2}，传递此参数表示不是 GET 请求而是 POST 请求
 * @param  {boolean}    jsonMode    数据 data 是否以 JSON 格式请求，默认为 false 则使用表单形式（a=1&b=2）
 * @param  {function}   callback    回调函数，兼容老版本调用代码，有两个参数，第一个参数表示错误，第二个参数是返回的数据
 *
 * @returns {Promise}               返回一个 Promise，在传递 callback 的情况下，可用 .then() 和 .catch() 处理返回的数据
 */
function dogecloudApi(apiPath, data = {}, jsonMode = false, callback = null) {
  // 这里替换为你的多吉云永久 AccessKey 和 SecretKey，可在用户中心 - 密钥管理中查看
  // 请勿在客户端暴露 AccessKey 和 SecretKey，那样恶意用户将获得账号完全控制权
  const accessKey = input.accessKey;
  const secretKey = input.secretKey;

  const body = jsonMode ? JSON.stringify(data) : querystring.encode(data);
  const sign = crypto
    .createHmac("sha1", secretKey)
    .update(Buffer.from(apiPath + "\n" + body, "utf8"))
    .digest("hex");
  const authorization = "TOKEN " + accessKey + ":" + sign;

  return new Promise(function (resolve, reject) {
    try {
      axios
        .request({
          url: "https://api.dogecloud.com" + apiPath,
          method: "POST",
          data: body,
          responseType: "json",
          headers: {
            "Content-Type": jsonMode
              ? "application/json"
              : "application/x-www-form-urlencoded",
            Authorization: authorization,
          },
        })
        .then(function (response) {
          if (response.data.code !== 200) {
            // API 返回错误
            callback
              ? callback({ Error: "API Error: " + response.data.msg }, null)
              : reject({
                  errno: response.data.code,
                  msg: "API Error: " + response.data.msg,
                });
            return;
          }
          callback
            ? callback(null, response.data.data)
            : resolve(response.data.data);
        })
        .catch(function (err) {
          callback ? callback(err, null) : reject(err);
        });
    } catch (error) {
      callback ? callback(error, null) : reject(err);
    }
  });
}

async function uploadCertificate() {
  const fullchain = fs.readFileSync(input.fullchainFile, "utf-8");
  const key = fs.readFileSync(input.keyFile, "utf-8");

  await dogecloudApi("/cdn/cert/upload.json", {
    note: "我的证书",
    cert: fullchain,
    private: key,
  }, false, function (err, data) {
    if (err) {
      throw new Error(`Failed to upload certificate: ${JSON.stringify(err)}`);
    }
    // console.log(data);
    return data.id;
  });
}

async function deployCertificate(id) {
  const domains = Array.from(new Set(input.domains.split(/\s+/).filter(x => x)));
  
  Promise.all(domains.map(async domain => {
    console.log(`Deploying certificate to domain ${domain}.`);

    return dogecloudApi("/cdn/domain/config.json?domain="+domain, {
      cert_id: id,
    }, true, function (err, data) {
      if (err) {
        throw new Error(`Failed to deploy certificate to domain "${domain}": ${JSON.stringify(err)}`);
      }
    });
  }))
}

async function main() {
  const id = await uploadCertificate();

  if (input.domains) await deployCertificate(id);
}

main().catch(error => {
  console.log(error.stack);
  core.setFailed(error);
  process.exit(1);
});