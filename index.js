const StellarSdk = require('stellar-sdk');
const server = new StellarSdk.Server('https://horizon.stellar.org');
const fs = require('fs');
const readlineSync = require('readline-sync');
const delay = require('delay');
const proxy = require("node-global-proxy").default;
const fetch = require('node-fetch');
const cheerio = require('cheerio');


const checkIp = () => {
    const res = fetch('https://ipv4.icanhazip.com')
        .then(res => res.text())
        .then(res => { return res })
        .catch(err => {
            return err;
        });
    return res;
};

const checkEglible = (ip, address) => {
    const res = fetch('https://afreum.com/ice/sites/app/containers/airdrop_eligibility.cfm', {
        method: 'POST',
        headers: {
            'authority': 'afreum.com',
            'accept': '*/*',
            'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'origin': 'https://afreum.com',
            'referer': 'https://afreum.com/ice/sites/app/index.cfm?sid=3&cid=73',
            'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="100", "Google Chrome";v="100"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36',
            'x-requested-with': 'XMLHttpRequest'
        },
        body: `iso_2=ID&ip_addr=${ip}&referer=&address=${address}`
    })
        .then(res => res.text())
        .then(res => {
            const $ = cheerio.load(res);
            const result = $('#register_form_div > div:nth-child(3) > p > b').text()
            return result;
        })
        .catch(err => {
            return err;
        });
    return res;
};



(async () => {

    const account = StellarSdk.Keypair.random();


    fs.appendFileSync('test.txt', `${account.publicKey()}|${account.secret()}\n`)

    const receivingKeys = StellarSdk.Keypair.fromSecret(
        account.secret(),
    );

    console.log('')
    console.log(`Agar bisa menambahkan trustline harap isi wallet xlm anda pada alamat berikut : ${account.publicKey()}`)
    readlineSync.question('Jika sudah tekan enter : ');
    console.log('menunggu beberapa detik...')
    await delay(5000);


    // Create an object to represent the new asset
    const afreumIDR = new StellarSdk.Asset("AIDR", "GCJFH6HI5UPQVTUUOAS7JPOEPCQZCNGM63GWMBL6ULGUL4XUXRIXXIEQ");

    // First, the receiving account must trust the asset
    server
        .loadAccount(receivingKeys.publicKey())
        .then(function (account) {

            const transaction = new StellarSdk.TransactionBuilder(account, {
                fee: 100,
                networkPassphrase: StellarSdk.Networks.PUBLIC,
            })
                .addOperation(
                    StellarSdk.Operation.changeTrust({
                        asset: afreumIDR,
                        limit: "1"
                    })
                )
                .addOperation(
                    StellarSdk.Operation.setOptions({
                        homeDomain: "lobstr.co",
                        inflationDest: ""
                    })
                )

                .setTimeout(1000)
                .build()


            transaction.sign(receivingKeys);


            return server.submitTransaction(transaction)
                .then(res => {
                    server
                        .loadAccount(receivingKeys.publicKey())
                        .then(async function (account) {
                            await proxy.setConfig('http://isipakeproxymu');
                            await proxy.start();
                            const ipResult = await checkIp();
                            const eglibleCheck = await checkEglible(ipResult.trim(), account.accountId());

                            await proxy.stop();

                            console.log(`
                        Success Create Account and Add trustline ${afreumIDR.code}.
        
                        Public Key : ${account.accountId()}

                        Status Egliblelity Airdrop : ${eglibleCheck}
        
                        Asset : 
                        ${account.balances.map(data => {
                                return `
                            Asset Type : ${data.asset_code ? data.asset_code : 'XLM'}
                            Balance : ${data.balance}
                            `;
                            })}
        
                        Detail saved at test.txt!
                    `)
                        }).catch(function (error) {
                            console.error("Error!", error);
                        });

                });
        })
        .catch(function (error) {
            console.error("Error!", error.response.data.extras);
        });
})();