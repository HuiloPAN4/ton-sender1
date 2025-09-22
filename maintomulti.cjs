const { mnemonicToWalletKey } = require("@ton/crypto");
const { WalletContractV4, TonClient, internal, toNano } = require("@ton/ton");
const { getHttpEndpoint } = require("@orbs-network/ton-access");
const { getSeed } = require('./utils/seeds.cjs');
const addressBook = require('./utils/addresses.cjs'); // Измененный импорт

// Конфигурация
const WALLET_ID = 1;
const RECIPIENTS = [1]; // берутся айди адрессов из /utils/addresses

function getRandomAmount() {
  const amount = (Math.random() * 0.008 + 15.001).toFixed(8);
  return {
    readable: amount,
    nano: toNano(amount)
  };
}

async function sendTransactions() {
  try {
    // 1. Инициализация кошелька
    const mnemonic = getSeed(WALLET_ID);
    if (!mnemonic) throw new Error(`Seed-фраза для кошелька ${WALLET_ID} не найдена`);
    
    const key = await mnemonicToWalletKey(mnemonic.split(" "));
    // const endpoint = await getHttpEndpoint({ network: "mainnet" });
    // const client = new TonClient({ endpoint });
    const endpoint = await getHttpEndpoint({ network: "mainnet" });
    const client = new TonClient({ endpoint, timeout: 60000 });
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
    const walletContract = client.open(wallet);
    
    console.log(` Адрес отправителя: ${walletContract.address.toString()}`);
    
    // 2. Проверка баланса
    const balance = await walletContract.getBalance();
    const balanceTon = Number(balance) / 1e9;
    console.log(` Текущий баланс: ${balanceTon.toFixed(4)} TON`);

    // 3. Обработка получателей
    for (const recipientId of RECIPIENTS) {
      try {
        const amount = getRandomAmount();
        const recipientAddress = addressBook[recipientId]; // Получаем адрес по ID
        
        if (!recipientAddress) {
          console.log(` Адрес для ID ${recipientId} не найден`);
          continue;
        }
        
        console.log(`\n--- Отправка на ID: ${recipientId} ---`);
        console.log(`Адрес: ${recipientAddress}`);
        console.log(`Сумма: ${amount.readable} TON`);

        if (balanceTon < parseFloat(amount.readable)) {
          console.log(" Недостаточно средств");
          continue;
        }

        const seqno = await walletContract.getSeqno();
        await walletContract.sendTransfer({
          secretKey: key.secretKey,
          seqno: seqno,
          messages: [internal({
            to: recipientAddress,
            value: amount.nano,
            bounce: false
          })]
        });

        // Ожидание подтверждения
        let currentSeqno = seqno;
        while (currentSeqno === seqno) {
          await sleep(3000);
          currentSeqno = await walletContract.getSeqno();
        }
        console.log("Подтверждено");

      } catch (error) {
  console.error('Full error:', {
    message: error.message,
    stack: error.stack,
    response: error.response?.data
  });
      }
      await sleep(6000);
    }
    
    console.log("\nВсе транзакции выполнены!");

  } catch (error) {
    console.error("Критическая ошибка:", error.message);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Запуск
sendTransactions();