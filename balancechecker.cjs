const { mnemonicToWalletKey } = require("@ton/crypto");
const { WalletContractV5R1, TonClient, internal, toNano } = require("@ton/ton");
const { getHttpEndpoint } = require("@orbs-network/ton-access");
const { getSeed, walletSeeds } = require('./utils/seeds.cjs');

const WALLETS = [
  {
    id: 1, // просто обозначения номера
    mnemonic: getSeed(1) // берется сидфраза из /utils/seeds под тем айдишником в которм написали
  }

]


async function checkBalances() {
    const endpoint = await getHttpEndpoint({ network: "mainnet" });
    const client = new TonClient({ endpoint });


  for (const walletData of WALLETS) {
    try {
      // 1. Получаем ключи из мнемоники
      const key = await mnemonicToWalletKey(walletData.mnemonic.split(" "));

      // 2. Инициализируем кошелёк V5R1
      const wallet = WalletContractV5R1.create({
        publicKey: key.publicKey,
        workchain: 0
      });
      const walletContract = client.open(wallet);

      // 3. Проверяем баланс
      const balance = await walletContract.getBalance();
      const balanceTon = parseFloat(balance.toString()) / 1e9;

      console.log(`\n Кошелёк ID: ${walletData.id}`);
      console.log(`Адрес: ${walletContract.address.toString()}`);
      console.log(`Баланс: ${balanceTon.toFixed(4)} TON`);

    } catch (error) {
      console.error(`Ошибка в кошельке ${walletData.id}:`, error.message);
    }
  }
}

// Вспомогательная функция
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Запуск
checkBalances().catch(console.error);