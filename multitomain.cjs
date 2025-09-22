const { mnemonicToWalletKey } = require("@ton/crypto");
const { WalletContractV5R1, TonClient, internal, toNano } = require("@ton/ton");
const { getHttpEndpoint } = require("@orbs-network/ton-access");
const { getSeed, walletSeeds } = require('./utils/seeds.cjs');

// Конфигурация
const RECIPIENT = "UQB5eDsYk6aaeYEqX3efOJ4Od5vy6r-5ByCOBXrV2m0j2J4L"; // Адрес получателя
const WALLETS = [
    {
    mnemonic: getSeed(1) // берутся сид фразы из /utils/seeds
  },

  
];



function getRandomAmount() {
  const amount = (Math.random() * 0.008 + 15.001).toFixed(8);
  return {
    readable: amount,
    nano: toNano(amount)
  };
}

async function sendPreciseTransfers() {
        const endpoint = await getHttpEndpoint({ network: "mainnet" });
        const client = new TonClient({ endpoint, timeout: 60000 });

  for (const [index, walletData] of WALLETS.entries()) {
    try {
      console.log(`\n Обработка кошелька ${index + 1}/${WALLETS.length}`);

      // 1. Получаем ключи
      const key = await mnemonicToWalletKey(walletData.mnemonic.split(" "));

      // 2. Инициализируем кошелёк V5R1
      const wallet = WalletContractV5R1.create({
        publicKey: key.publicKey,
        workchain: 0
      });
      const walletContract = client.open(wallet);

      const amount = getRandomAmount();
      console.log(`Случайная сумма: ${amount.readable} TON`);

      console.log(` Адрес: ${walletContract.address.toString()}`);
      console.log(`Отправляемая сумма: ${amount.readable} TON`);

      // 3. Проверяем баланс
      const balance = await walletContract.getBalance();
      const balanceTon = parseFloat(balance.toString()) / 1e9;

      if (balanceTon < parseFloat(walletData.amount)) {
        console.log(` Недостаточно средств: ${balanceTon} < ${walletData.amount}`);
        continue;
      }


      const seqno = await walletContract.getSeqno();
      await walletContract.sendTransfer({
        secretKey: key.secretKey,
        seqno: seqno,
        messages: [
          internal({
            to: RECIPIENT,
            value: amount.nano, 
            bounce: false
          })
        ]
      });

      console.log(" Ожидаем подтверждения...");

      // 5. Ждём подтверждения
      let attempts = 0;
      let currentSeqno = seqno;
      while (currentSeqno === seqno && attempts < 10) {
        await sleep(2000);
        currentSeqno = await walletContract.getSeqno();
        attempts++;
      }

      const finalBalance = await walletContract.getBalance();
      const finalBalanceTon = parseFloat(finalBalance.toString()) / 1e9;
      
      console.log(`Остаток: ${finalBalanceTon} TON`);

      if (currentSeqno !== seqno) {
        console.log(" Успешно!");
      } else {
        console.log(" Транзакция не подтвердилась");
      }

    } catch (error) {
      console.error(` Ошибка: ${error.message}`);
    }

    // Пауза между кошельками (если нужно)
    if (index < WALLETS.length - 1) {
      await sleep(3000);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Запуск
sendPreciseTransfers().catch(console.error);